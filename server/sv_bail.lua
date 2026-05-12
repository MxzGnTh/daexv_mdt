-- sv_bail.lua - Sistema de fianzas y presos (daexv_mdt v2)

local function CalculateBailForIndividual(individualId)
    local charges  = MySQL.query.await("SELECT fine FROM daexv_mdt_charges WHERE individual_id=? AND status='open'", { individualId })
    local prevRows = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_inmates WHERE individual_id=? AND status='released'", { individualId })

    local baseFine = 0
    for _, c in ipairs(charges) do
        baseFine = baseFine + (tonumber(c.fine) or 0)
    end

    local prevCount   = (prevRows[1] and prevRows[1].n) or 0
    local multiplier  = Config.Bail.BaseBailMultiplier * (1 + prevCount * Config.Bail.RepeatOffenderMultiplier)
    local bail        = math.floor(baseFine * multiplier)

    if bail < Config.Bail.MinBail then bail = Config.Bail.MinBail end
    if bail > Config.Bail.MaxBail then bail = Config.Bail.MaxBail end
    return bail
end

-- Registrar nuevo preso
RegisterNetEvent('daexv_mdt:server:registerInmate')
AddEventHandler('daexv_mdt:server:registerInmate', function(data)
    local src = source
    if not HasPermission(src, 'register_inmate') then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    data = data or {}
    local individualId  = ToInt(data.individualId, 0)
    local citizenId     = Trim(tostring(data.citizenIdentifier or ''), 60)
    local citizenName   = Trim(tostring(data.citizenName or 'Unknown'), 100)
    local sentenceTime  = ToInt(data.sentenceTime, 0)
    local prisonLoc     = Trim(tostring(data.prisonLocation or 'Sisika'), 100)
    local caseRefId     = ToInt(data.caseRefId, nil)
    local chargesJson   = data.chargesSummary

    if type(chargesJson) == 'table' then
        chargesJson = json.encode(chargesJson)
    else
        chargesJson = Trim(tostring(chargesJson or '[]'), 2000)
    end

    if individualId == 0 or citizenId == '' then
        NotifyPlayer(src, 'Datos de recluso invalidos.', 5000)
        return
    end

    local bail = 0
    if Config.Bail.AutoCalculateBail then
        bail = CalculateBailForIndividual(individualId)
    end

    local inmateId = MySQL.insert.await(
        "INSERT INTO daexv_mdt_inmates (individual_id, citizen_identifier, citizen_name, charges_summary, sentence_time, bail_amount, bail_status, prison_location, arrested_by, arrested_by_name, case_ref_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        { individualId, citizenId, citizenName, chargesJson, sentenceTime, bail, 'available', prisonLoc, officer.identifier, officer.fullname, caseRefId }
    )

    AuditLog(officer.identifier, officer.fullname, 'register_inmate', 'inmate', inmateId, citizenName .. ' | bail=$' .. bail)
    NotifyPlayer(src, 'Recluso registrado. Fianza fijada en $' .. bail .. '.', 5000)

    local targetSrc = FindOnlinePlayerByIdentifier(citizenId)
    if targetSrc then
        TriggerClientEvent('daexv_mdt:client:bailSet', targetSrc, { inmateId = inmateId, amount = bail })
        TriggerClientEvent('vorp:TipRight', targetSrc, 'Has sido encarcelado en ' .. prisonLoc .. '. Fianza: $' .. bail .. '. Usa /paybail ' .. inmateId .. '.', 8000)
    end
end)

-- Listar presos activos (paginado)
RegisterNetEvent('daexv_mdt:server:getInmates')
AddEventHandler('daexv_mdt:server:getInmates', function(filters, page, cbId)
    local src = source
    if not HasPermission(src, 'view_inmates') then return end

    filters = filters or {}
    page    = ToInt(page, 1)
    local perPage = 20
    local offset  = (page - 1) * perPage

    local where  = "WHERE i.status='incarcerated'"
    local params = {}

    if filters.citizenName and filters.citizenName ~= '' then
        where = where .. " AND i.citizen_name LIKE ?"
        params[#params + 1] = '%' .. Trim(filters.citizenName, 50) .. '%'
    end
    if filters.bailStatus and filters.bailStatus ~= '' and filters.bailStatus ~= 'all' then
        where = where .. " AND i.bail_status=?"
        params[#params + 1] = IsAllowedValue(filters.bailStatus, { available=true, paid=true, denied=true, not_applicable=true }, 'available')
    end

    local countParams = {}
    for _, v in ipairs(params) do countParams[#countParams + 1] = v end
    local totalRows = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_inmates i " .. where, countParams)
    local total     = (totalRows[1] and totalRows[1].n) or 0

    params[#params + 1] = perPage
    params[#params + 1] = offset
    local rows = MySQL.query.await("SELECT i.* FROM daexv_mdt_inmates i " .. where .. " ORDER BY i.created_at DESC LIMIT ? OFFSET ?", params)

    SendCallback(src, cbId, { inmates = rows or {}, total = total, page = page, perPage = perPage })
end)

-- Obtener un preso especifico
RegisterNetEvent('daexv_mdt:server:getInmate')
AddEventHandler('daexv_mdt:server:getInmate', function(inmateId, cbId)
    local src = source
    if not HasPermission(src, 'view_inmates') then return end

    inmateId = ToInt(inmateId, 0)
    if inmateId == 0 then return end

    local rows = MySQL.query.await("SELECT * FROM daexv_mdt_inmates WHERE id=?", { inmateId })
    if not rows or #rows == 0 then
        SendCallback(src, cbId, nil)
        return
    end

    local inmate = rows[1]
    if inmate.charges_summary and type(inmate.charges_summary) == 'string' then
        inmate.charges_summary = json.decode(inmate.charges_summary) or {}
    end

    SendCallback(src, cbId, inmate)
end)

-- Calcular fianza manualmente
RegisterNetEvent('daexv_mdt:server:calculateBail')
AddEventHandler('daexv_mdt:server:calculateBail', function(individualId, cbId)
    local src = source
    if not HasPermission(src, 'view_inmates') then return end

    individualId = ToInt(individualId, 0)
    if individualId == 0 then return end

    local bail = CalculateBailForIndividual(individualId)
    SendCallback(src, cbId, { bail = bail })
end)

-- Pagar fianza (disponible para cualquiera con dinero)
RegisterNetEvent('daexv_mdt:server:payBail')
AddEventHandler('daexv_mdt:server:payBail', function(inmateId, paymentMethod)
    local src    = source
    inmateId     = ToInt(inmateId, 0)
    paymentMethod = IsAllowedValue(paymentMethod, { cash=true, bank=true, other=true }, 'cash')

    if inmateId == 0 then
        NotifyPlayer(src, 'ID de recluso invalido.', 4000)
        return
    end

    local rows = MySQL.query.await("SELECT * FROM daexv_mdt_inmates WHERE id=? AND status='incarcerated'", { inmateId })
    if not rows or #rows == 0 then
        NotifyPlayer(src, 'Recluso no encontrado o ya liberado.', 5000)
        return
    end
    local inmate = rows[1]

    if inmate.bail_status == 'denied' then
        NotifyPlayer(src, 'La corte nego la fianza. No se puede pagar.', 5000)
        return
    end
    if inmate.bail_status == 'paid' then
        NotifyPlayer(src, 'La fianza ya fue pagada.', 4000)
        return
    end
    if inmate.bail_status == 'not_applicable' then
        NotifyPlayer(src, 'La fianza no aplica para este recluso.', 4000)
        return
    end

    local payerChar = GetCharacterData(src)
    if not payerChar then
        NotifyPlayer(src, 'No se pudieron obtener los datos del personaje.', 4000)
        return
    end

    local amount = inmate.bail_amount
    local user   = VORPcore.getUser(src)
    if not user then return end
    local char = user.getUsedCharacter
    if not char then return end

    local currencyType = paymentMethod == 'bank' and 1 or 0
    local balance = char.money
    if currencyType == 1 then balance = char.gold end

    if (tonumber(balance) or 0) < amount then
        NotifyPlayer(src, 'Fondos insuficientes. Monto de fianza: $' .. amount, 5000)
        return
    end

    char.removeCurrency(currencyType, amount)

    MySQL.update.await(
        "UPDATE daexv_mdt_inmates SET bail_status='paid', bail_paid_by=?, bail_paid_by_name=?, bail_paid_at=NOW(), release_type='bail', status='released', released_at=NOW() WHERE id=?",
        { payerChar.identifier, payerChar.fullname, inmateId }
    )

    AuditLog(payerChar.identifier, payerChar.fullname, 'pay_bail', 'inmate', inmateId, 'Paid $' .. amount .. ' for ' .. inmate.citizen_name)
    NotifyPlayer(src, 'Fianza pagada. $' .. amount .. ' descontados. ' .. inmate.citizen_name .. ' queda en libertad.', 6000)

    local targetSrc = FindOnlinePlayerByIdentifier(inmate.citizen_identifier)
    if targetSrc then
        TriggerClientEvent('daexv_mdt:client:bailPaid', targetSrc, { inmateId = inmateId, paidBy = payerChar.fullname })
        TriggerClientEvent('vorp:TipRight', targetSrc, 'Tu fianza fue pagada por ' .. payerChar.fullname .. '. Ya puedes retirarte.', 8000)
    end
end)

-- Negar fianza (level 4 = juez)
RegisterNetEvent('daexv_mdt:server:denyBail')
AddEventHandler('daexv_mdt:server:denyBail', function(inmateId)
    local src = source
    if not HasPermission(src, 'deny_bail') then return end

    inmateId = ToInt(inmateId, 0)
    if inmateId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    MySQL.update.await("UPDATE daexv_mdt_inmates SET bail_status='denied' WHERE id=? AND status='incarcerated'", { inmateId })

    AuditLog(officer.identifier, officer.fullname, 'deny_bail', 'inmate', inmateId, 'Fianza denegada')
    NotifyPlayer(src, 'Fianza denegada para recluso #' .. inmateId .. '.', 4000)

    local rows = MySQL.query.await("SELECT citizen_identifier, citizen_name FROM daexv_mdt_inmates WHERE id=?", { inmateId })
    if rows and rows[1] then
        local targetSrc = FindOnlinePlayerByIdentifier(rows[1].citizen_identifier)
        if targetSrc then
            TriggerClientEvent('vorp:TipRight', targetSrc, 'La corte nego tu solicitud de fianza. Debes cumplir la sentencia completa.', 8000)
        end
    end
end)

-- Ajustar monto de fianza (level 3+)
RegisterNetEvent('daexv_mdt:server:adjustBail')
AddEventHandler('daexv_mdt:server:adjustBail', function(inmateId, newAmount)
    local src = source
    if not HasPermission(src, 'adjust_bail') then return end

    inmateId  = ToInt(inmateId, 0)
    newAmount = ToInt(newAmount, 0)
    if inmateId == 0 or newAmount < 0 then return end

    newAmount = math.max(0, math.min(Config.Bail.MaxBail, newAmount))

    local officer = GetCharacterData(src)
    if not officer then return end

    MySQL.update.await("UPDATE daexv_mdt_inmates SET bail_amount=?, bail_status='available' WHERE id=? AND status='incarcerated'", { newAmount, inmateId })

    AuditLog(officer.identifier, officer.fullname, 'adjust_bail', 'inmate', inmateId, 'New bail: $' .. newAmount)
    NotifyPlayer(src, 'Fianza ajustada a $' .. newAmount .. '.', 4000)
end)

-- Liberar preso manualmente (level 3+)
RegisterNetEvent('daexv_mdt:server:releaseInmate')
AddEventHandler('daexv_mdt:server:releaseInmate', function(inmateId, releaseType)
    local src = source
    if not HasPermission(src, 'release_inmate') then return end

    inmateId    = ToInt(inmateId, 0)
    releaseType = IsAllowedValue(releaseType, { served=true, bail=true, pardon=true, escape=true, transfer=true }, 'served')
    if inmateId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    local rows = MySQL.query.await("SELECT citizen_identifier, citizen_name FROM daexv_mdt_inmates WHERE id=? AND status='incarcerated'", { inmateId })
    if not rows or #rows == 0 then
        NotifyPlayer(src, 'Recluso no encontrado o ya liberado.', 4000)
        return
    end

    MySQL.update.await(
        "UPDATE daexv_mdt_inmates SET status='released', release_type=?, released_at=NOW() WHERE id=?",
        { releaseType, inmateId }
    )

    AuditLog(officer.identifier, officer.fullname, 'release_inmate', 'inmate', inmateId, 'Released: ' .. releaseType)
    NotifyPlayer(src, 'Recluso #' .. inmateId .. ' liberado (' .. releaseType .. ').', 4000)

    local targetSrc = FindOnlinePlayerByIdentifier(rows[1].citizen_identifier)
    if targetSrc then
        TriggerClientEvent('vorp:TipRight', targetSrc, 'Has sido liberado de ' .. (rows[1].citizen_name or 'prison') .. '. Tipo: ' .. releaseType, 6000)
    end
end)

-- Estadisticas de presos (para dashboard)
RegisterNetEvent('daexv_mdt:server:getInmateStats')
AddEventHandler('daexv_mdt:server:getInmateStats', function(cbId)
    local src = source
    if not HasPermission(src, 'view_inmates') then return end

    local total    = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_inmates WHERE status='incarcerated'", {})
    local awaiting = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_inmates WHERE status='incarcerated' AND bail_status='available'", {})
    local denied   = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_inmates WHERE status='incarcerated' AND bail_status='denied'", {})
    local today    = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_inmates WHERE status='released' AND DATE(released_at)=CURDATE()", {})

    SendCallback(src, cbId, {
        total         = (total[1]    and total[1].n)    or 0,
        awaitingBail  = (awaiting[1] and awaiting[1].n) or 0,
        bailDenied    = (denied[1]   and denied[1].n)   or 0,
        releasedToday = (today[1]    and today[1].n)    or 0,
    })
end)



RegisterNetEvent('daexv_mdt:server:getInmateForCitizen')
AddEventHandler('daexv_mdt:server:getInmateForCitizen', function(inmateId)
    local src = source
    inmateId = ToInt(inmateId, 0)
    if inmateId == 0 then
        NotifyPlayer(src, 'Uso: /' .. Config.Bail.BailViewCommand .. ' [id_recluso]', 5000)
        return
    end

    local charData = GetCharacterData(src)
    if not charData then return end

    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_inmates WHERE id = ? AND citizen_identifier = ? LIMIT 1', { inmateId, charData.identifier })
    if not rows or not rows[1] then
        TriggerClientEvent('daexv_mdt:client:inmateInfo', src, {})
        return
    end

    TriggerClientEvent('daexv_mdt:client:inmateInfo', src, rows[1])
end)
