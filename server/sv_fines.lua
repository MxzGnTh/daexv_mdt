local fineStatuses = { pending=true, paid=true, overdue=true, cancelled=true, waived=true }
local payMethods = { cash=true, bank=true, seized=true, other=true }

local function getOnlineSourceByIdentifier(identifier)
    identifier = tostring(identifier or '')
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local charData = GetCharacterData(src)
        if charData and tostring(charData.identifier) == identifier then
            return src
        end
    end
    return nil
end

local function getFineById(fineId)
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_fines WHERE id = ? LIMIT 1', { ToInt(fineId) })
    return rows and rows[1] or nil
end

local function calculatePaymentAmount(fine)
    local amount = ToInt(fine.amount)
    local discount = tonumber(Config.Fines.EarlyPaymentDiscount or 0) or 0
    if discount <= 0 then return amount end
    local recent = MySQL.scalar.await('SELECT TIMESTAMPDIFF(HOUR, created_at, NOW()) FROM daexv_mdt_fines WHERE id = ?', { fine.id }) or 999
    if tonumber(recent) < 24 then
        return math.max(0, math.floor(amount * (1 - discount)))
    end
    return amount
end

local function syncFineToLegalDocs(fineId, fineData, officerIdentifier)
    exports[GetCurrentResourceName()]:RegisterLegalDocOnCitizen(fineData.citizenIdentifier, {
        type = 'multa',
        doc_code = 'AV-MUL',
        title = 'Multa: ' .. fineData.charge .. ' - $' .. tostring(fineData.amount),
        doc_id = fineId,
        section = 'fines',
        issued_by = officerIdentifier,
    })
end

local function createCitationCase(officer, citizen, data)
    local title = 'Citacion: ' .. data.charge .. ' - ' .. citizen.fullname
    local summary = 'Multa emitida por ' .. data.charge .. ' en ' .. (data.location ~= '' and data.location or 'Ubicacion desconocida') .. '. Monto: $' .. tostring(data.amount) .. '.'
    return MySQL.insert.await([[INSERT INTO daexv_mdt_cases
        (title, case_type, state, summary, content, access_level, citizen_id, citizen_name, created_by, created_by_name)
        VALUES (?, 'citation', 'open', ?, ?, 'law', ?, ?, ?, ?)]], {
        title, summary, data.description or summary, citizen.id, citizen.fullname, officer.identifier, officer.fullname
    })
end

RegisterNetEvent('daexv_mdt:server:issueFine')
AddEventHandler('daexv_mdt:server:issueFine', function(data)
    local src = source
    if not IsLawEnforcement(src) or GetOfficerLevel(src) < (Config.Fines.IssueFineLevel or 1) or not HasPermission(src, 'issue_fine') then return end
    data = data or {}
    local individualId = ToInt(data.individualId or data.individual_id)
    local charge = Trim(data.charge, 255)
    local amount = ToInt(data.amount)
    if individualId <= 0 or charge == '' or amount <= 0 then
        NotifyPlayer(src, 'Ciudadano, cargo y monto son obligatorios para emitir una multa.', 4500)
        return
    end

    local rows = MySQL.query.await('SELECT id, identifier, firstname, lastname FROM daexv_mdt_individuals WHERE id = ? LIMIT 1', { individualId })
    local citizenRow = rows and rows[1] or nil
    if not citizenRow then NotifyPlayer(src, 'Ficha ciudadana no encontrada.', 3500) return end

    local officer = GetCharacterData(src)
    local citizen = {
        id = citizenRow.id,
        identifier = tostring(citizenRow.identifier),
        fullname = Trim((citizenRow.firstname or '') .. ' ' .. (citizenRow.lastname or ''), 100)
    }
    local payload = {
        charge = charge,
        penalCode = Trim(data.penalCode or data.penal_code, 20),
        category = Trim(data.category, 50),
        amount = amount,
        description = Trim(data.description, 4000),
        location = Trim(data.location, 200)
    }
    local caseRefId = data.caseRefId and ToInt(data.caseRefId) or data.case_ref_id and ToInt(data.case_ref_id) or nil
    if not caseRefId or caseRefId <= 0 then
        caseRefId = createCitationCase(officer, citizen, payload)
    end

    local fineId = MySQL.insert.await([[INSERT INTO daexv_mdt_fines
        (individual_id, citizen_identifier, citizen_name, charge, penal_code, category, description, location, amount, status, due_date,
         officer_identifier, officer_name, officer_rank, case_ref_id)
        VALUES (?,?,?,?,?,?,?,?,?,'pending',DATE_ADD(NOW(), INTERVAL ? DAY),?,?,?,?)]], {
        citizen.id, citizen.identifier, citizen.fullname, payload.charge, payload.penalCode, payload.category, payload.description, payload.location, payload.amount,
        ToInt(Config.Fines.OverdueDays, 3), officer.identifier, officer.fullname, GetOfficerRank(src) or '', caseRefId
    })

    syncFineToLegalDocs(fineId, {
        citizenIdentifier = citizen.identifier,
        charge = payload.charge,
        amount = payload.amount,
    }, officer.identifier)

    AuditLog(officer.identifier, officer.fullname, 'issued_fine', 'fine', fineId, 'Issued $' .. amount .. ' fine to ' .. citizen.fullname .. ' for ' .. charge)

    if Config.Fines.NotifyOnFine then
        local targetSource = getOnlineSourceByIdentifier(citizen.identifier)
        if targetSource then
            local fineData = { id = fineId, amount = amount, charge = charge, penalCode = payload.penalCode, status = 'pending', dueDate = Config.Fines.OverdueDays }
            TriggerClientEvent('daexv_mdt:client:fineReceived', targetSource, fineData)
            NotifyPlayer(targetSource, 'Has recibido una multa de $' .. amount .. ' por ' .. charge .. '. Usa /' .. Config.Fines.CitizenCommand .. ' para verla.', 8000)
        end
    end

    NotifyPlayer(src, 'Multa de $' .. amount .. ' emitida a ' .. citizen.fullname .. '.', 5000)
    TriggerClientEvent('daexv_mdt:client:fineIssued', src, { success = true, fineId = fineId })
end)

RegisterNetEvent('daexv_mdt:server:getFines')
AddEventHandler('daexv_mdt:server:getFines', function(individualId, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_fines') then return end
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_fines WHERE individual_id = ? ORDER BY FIELD(status,"overdue","pending","paid","cancelled","waived"), created_at DESC', { ToInt(individualId) })
    SendCallback(src, cbId, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:getMyFines')
AddEventHandler('daexv_mdt:server:getMyFines', function()
    local src = source
    local charData = GetCharacterData(src)
    if not charData then return end
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_fines WHERE citizen_identifier = ? AND status IN ("pending","overdue") ORDER BY FIELD(status,"overdue","pending"), created_at DESC', { charData.identifier })
    TriggerClientEvent('daexv_mdt:client:myFines', src, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:payFine')
AddEventHandler('daexv_mdt:server:payFine', function(fineId, paymentMethod)
    local src = source
    paymentMethod = IsAllowedValue(paymentMethod or Config.Fines.DefaultPaymentMethod, payMethods, Config.Fines.DefaultPaymentMethod or 'cash')
    if paymentMethod ~= 'cash' then
        NotifyPlayer(src, 'Por ahora solo se aceptan pagos en efectivo. Usa /' .. Config.Fines.PayCommand .. ' [id_multa] cash', 5500)
        return
    end
    local charData = GetCharacterData(src)
    local character = GetVorpCharacter(src)
    if not charData or not character then return end

    local fine = MySQL.query.await('SELECT * FROM daexv_mdt_fines WHERE id = ? AND citizen_identifier = ? AND status IN ("pending","overdue") LIMIT 1', { ToInt(fineId), charData.identifier })
    fine = fine and fine[1] or nil
    if not fine then NotifyPlayer(src, 'Multa no encontrada o ya cerrada.', 5000) return end

    local finalAmount = calculatePaymentAmount(fine)
    local playerMoney = tonumber(character.money or 0) or 0
    if playerMoney < finalAmount then
        NotifyPlayer(src, 'No tienes suficiente dinero. Multa: $' .. finalAmount, 5000)
        return
    end

    character.removeCurrency(0, finalAmount)
    MySQL.update.await('UPDATE daexv_mdt_fines SET status="paid", paid_at=NOW(), paid_amount=?, payment_method=?, payment_note=? WHERE id=?', {
        finalAmount, paymentMethod, paymentMethod == 'bank' and 'Bank requested; cash currency removed by VORP compatibility layer' or '', fine.id
    })

    AuditLog(charData.identifier, charData.fullname, 'fine_paid', 'fine', fine.id, fine.citizen_name .. ' paid $' .. finalAmount .. ' fine #' .. fine.id)
    NotifyPlayer(src, 'Multa pagada: $' .. finalAmount .. '. Gracias.', 5000)
    TriggerClientEvent('daexv_mdt:client:finePaid', src, { fineId = fine.id, amount = finalAmount })

    if Config.Fines.NotifyOnPayment then
        local officerSource = getOnlineSourceByIdentifier(fine.officer_identifier)
        if officerSource then
            NotifyPlayer(officerSource, fine.citizen_name .. ' ha pagado la multa #' .. fine.id .. ' por $' .. finalAmount .. '.', 5000)
        end
    end
end)

RegisterNetEvent('daexv_mdt:server:cancelFine')
AddEventHandler('daexv_mdt:server:cancelFine', function(fineId, reason)
    local src = source
    if not IsLawEnforcement(src) or GetOfficerLevel(src) < (Config.Fines.CancelFineLevel or 2) or not HasPermission(src, 'cancel_fine') then return end
    local officer = GetCharacterData(src)
    local fine = getFineById(fineId)
    if not fine or fine.status == 'paid' or fine.status == 'cancelled' or fine.status == 'waived' then
        NotifyPlayer(src, 'Esta multa no se puede cancelar.', 3500)
        return
    end
    reason = Trim(reason, 1000)
    if #reason < 4 then
        NotifyPlayer(src, 'Indica una razon valida para cancelar.', 3500)
        return
    end
    MySQL.update.await('UPDATE daexv_mdt_fines SET status="cancelled", cancelled_by=?, cancelled_by_name=?, cancelled_reason=? WHERE id=?', { officer.identifier, officer.fullname, reason, fine.id })
    AuditLog(officer.identifier, officer.fullname, 'cancelled_fine', 'fine', fine.id, 'Cancelled fine #' .. fine.id .. ' - Reason: ' .. reason)
    local targetSource = getOnlineSourceByIdentifier(fine.citizen_identifier)
    if targetSource then NotifyPlayer(targetSource, 'La multa #' .. fine.id .. ' ha sido cancelada.', 6000) end
    NotifyPlayer(src, 'Multa cancelada.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:waiveFine')
AddEventHandler('daexv_mdt:server:waiveFine', function(fineId, reason)
    local src = source
    if not IsLawEnforcement(src) or GetOfficerLevel(src) < (Config.Fines.WaiveFineLevel or 3) or not HasPermission(src, 'waive_fine') then return end
    local officer = GetCharacterData(src)
    local fine = getFineById(fineId)
    if not fine or fine.status == 'paid' or fine.status == 'cancelled' or fine.status == 'waived' then
        NotifyPlayer(src, 'Esta multa no se puede perdonar.', 3500)
        return
    end
    reason = Trim(reason, 1000)
    if #reason < 4 then
        NotifyPlayer(src, 'Indica una razon valida para perdonar.', 3500)
        return
    end
    MySQL.update.await('UPDATE daexv_mdt_fines SET status="waived", cancelled_by=?, cancelled_by_name=?, cancelled_reason=? WHERE id=?', { officer.identifier, officer.fullname, reason, fine.id })
    AuditLog(officer.identifier, officer.fullname, 'waived_fine', 'fine', fine.id, 'Waived fine #' .. fine.id .. ' - Reason: ' .. reason)
    local targetSource = getOnlineSourceByIdentifier(fine.citizen_identifier)
    if targetSource then NotifyPlayer(targetSource, 'La multa #' .. fine.id .. ' ha sido perdonada.', 6000) end
    NotifyPlayer(src, 'Multa perdonada.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:getFinePresets')
AddEventHandler('daexv_mdt:server:getFinePresets', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_fines') then return end
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_fine_presets WHERE active = 1 ORDER BY category, charge', {})
    SendCallback(src, cbId, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:getFineStats')
AddEventHandler('daexv_mdt:server:getFineStats', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or GetOfficerLevel(src) < 2 then return end
    local stats = {}
    stats.totalFines = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_fines') or 0
    stats.pendingFines = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_fines WHERE status = "pending"') or 0
    stats.overdueFines = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_fines WHERE status = "overdue"') or 0
    stats.paidFines = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_fines WHERE status = "paid"') or 0
    stats.totalCollected = MySQL.scalar.await('SELECT COALESCE(SUM(paid_amount),0) FROM daexv_mdt_fines WHERE status = "paid"') or 0
    stats.totalPending = MySQL.scalar.await('SELECT COALESCE(SUM(amount),0) FROM daexv_mdt_fines WHERE status IN ("pending","overdue")') or 0
    SendCallback(src, cbId, stats)
end)

RegisterNetEvent('daexv_mdt:server:getAllFines')
AddEventHandler('daexv_mdt:server:getAllFines', function(filters, page, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_fines') then return end
    filters = filters or {}; page = math.max(1, ToInt(page, 1))
    local where = { '1=1' }
    local params = {}
    local search = Trim(filters.search, 80)
    if search ~= '' then
        local like = '%' .. search .. '%'
        where[#where+1] = '(citizen_name LIKE ? OR charge LIKE ? OR penal_code LIKE ? OR officer_name LIKE ?)'
        params[#params+1] = like; params[#params+1] = like; params[#params+1] = like; params[#params+1] = like
    end
    local status = tostring(filters.status or '')
    if status ~= '' and fineStatuses[status] then where[#where+1] = 'status = ?'; params[#params+1] = status end
    if Trim(filters.officerIdentifier, 60) ~= '' then where[#where+1] = 'officer_identifier = ?'; params[#params+1] = Trim(filters.officerIdentifier, 60) end
    local clause = table.concat(where, ' AND ')
    local countRows = MySQL.query.await('SELECT COUNT(*) AS total FROM daexv_mdt_fines WHERE ' .. clause, params)
    local total = countRows and countRows[1] and countRows[1].total or 0
    local fetchParams = {}
    for _, v in ipairs(params) do fetchParams[#fetchParams+1] = v end
    fetchParams[#fetchParams+1] = 15; fetchParams[#fetchParams+1] = (page - 1) * 15
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_fines WHERE ' .. clause .. ' ORDER BY FIELD(status,"overdue","pending","paid","cancelled","waived"), created_at DESC LIMIT ? OFFSET ?', fetchParams)
    SendCallback(src, cbId, { fines = rows or {}, totalCount = total, page = page })
end)

CreateThread(function()
    while true do
        Wait(300000)
        MySQL.update.await('UPDATE daexv_mdt_fines SET status = "overdue" WHERE status = "pending" AND due_date IS NOT NULL AND due_date < NOW()', {})
    end
end)




