RegisterNetEvent('daexv_mdt:server:getWantedList')
AddEventHandler('daexv_mdt:server:getWantedList', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_warrants') then return end
    local rows = MySQL.query.await([[SELECT w.*, i.firstname, i.lastname, i.image_url, i.aliases
        FROM daexv_mdt_warrants w JOIN daexv_mdt_individuals i ON w.individual_id = i.id
        WHERE w.status IN ('pending','active')
        ORDER BY FIELD(w.danger_level,'extreme','high','medium','low'), w.bounty DESC]], {})
    SendCallback(src, cbId, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:createWarrant')
AddEventHandler('daexv_mdt:server:createWarrant', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'create_warrant') then return end
    data = data or {}
    local individualId = ToInt(data.individualId or data.individual_id)
    local title = Trim(data.title, 255)
    if individualId <= 0 or title == '' then NotifyPlayer(src, 'Ciudadano y titulo de orden son obligatorios.', 3500) return end
    local identifier = GetIndividualIdentifier(individualId)
    if not identifier then NotifyPlayer(src, 'Ficha ciudadana no encontrada.', 3500) return end
    local officer = GetCharacterData(src)
    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_warrants
        (individual_id, identifier, title, charges, reason, danger_level, bounty, status, created_by, created_by_name)
        VALUES (?,?,?,?,?,?,?,?,?,?)]], {
        individualId, identifier, title, Trim(data.charges, 4000), Trim(data.reason, 4000), IsAllowedValue(data.dangerLevel or data.danger_level, DaexvMDTEnums.danger, 'medium'),
        ToInt(data.bounty), 'pending', officer.identifier, officer.fullname
    })
    AuditLog(officer.identifier, officer.fullname, 'created warrant', 'warrant', id, title)
    NotifyPlayer(src, 'Orden redactada para firma judicial.', 3500)
end)

RegisterNetEvent('daexv_mdt:server:signWarrant')
AddEventHandler('daexv_mdt:server:signWarrant', function(warrantId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'sign_warrant') then return end
    warrantId = ToInt(warrantId)
    local rows = MySQL.query.await('SELECT individual_id FROM daexv_mdt_warrants WHERE id = ? LIMIT 1', { warrantId })
    if not rows or not rows[1] then return end
    local officer = GetCharacterData(src)
    MySQL.update.await('UPDATE daexv_mdt_warrants SET status="active", signed_by=?, signed_by_name=?, signed_at=NOW() WHERE id=?', { officer.identifier, officer.fullname, warrantId })
    MySQL.update.await('UPDATE daexv_mdt_individuals SET status="wanted" WHERE id=? AND status NOT IN ("deceased","archived")', { rows[1].individual_id })
    AuditLog(officer.identifier, officer.fullname, 'signed warrant', 'warrant', warrantId, '')
    NotifyPlayer(src, 'Orden firmada y activa.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:executeWarrant')
AddEventHandler('daexv_mdt:server:executeWarrant', function(warrantId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'execute_warrant') then return end
    warrantId = ToInt(warrantId)
    local rows = MySQL.query.await('SELECT individual_id FROM daexv_mdt_warrants WHERE id = ? LIMIT 1', { warrantId })
    if not rows or not rows[1] then return end
    local officer = GetCharacterData(src)
    MySQL.update.await('UPDATE daexv_mdt_warrants SET status="executed", executed_by=?, executed_by_name=?, executed_at=NOW() WHERE id=?', { officer.identifier, officer.fullname, warrantId })
    RefreshIndividualWantedStatus(rows[1].individual_id)
    AuditLog(officer.identifier, officer.fullname, 'executed warrant', 'warrant', warrantId, '')
    NotifyPlayer(src, 'Orden marcada como ejecutada.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:cancelWarrant')
AddEventHandler('daexv_mdt:server:cancelWarrant', function(warrantId, reason)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'cancel_warrant') then return end
    warrantId = ToInt(warrantId)
    local rows = MySQL.query.await('SELECT individual_id FROM daexv_mdt_warrants WHERE id = ? LIMIT 1', { warrantId })
    if not rows or not rows[1] then return end
    MySQL.update.await('UPDATE daexv_mdt_warrants SET status="cancelled", cancelled_reason=? WHERE id=?', { Trim(reason, 1000), warrantId })
    RefreshIndividualWantedStatus(rows[1].individual_id)
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'cancelled warrant', 'warrant', warrantId, Trim(reason, 1000))
    NotifyPlayer(src, 'Orden cancelada.', 3000)
end)

