local function notifyIfOnline(identifier, message)
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local charData = GetCharacterData(src)
        if charData and tostring(charData.identifier) == tostring(identifier) then
            NotifyPlayer(src, message, 6000)
            return true
        end
    end
    return false
end

RegisterNetEvent('daexv_mdt:server:sendTelegram')
AddEventHandler('daexv_mdt:server:sendTelegram', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'send_telegram') then return end
    data = data or {}
    local toIdentifier = Trim(data.toIdentifier or data.to_identifier, 60)
    local subject = Trim(data.subject, 200)
    local body = Trim(data.body, 8000)
    if toIdentifier == '' or subject == '' or body == '' then NotifyPlayer(src, 'Destinatario, asunto y mensaje son obligatorios.', 3500) return end
    local officer = GetCharacterData(src)
    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_telegrams (from_identifier, from_name, to_identifier, to_name, subject, body, urgent, ref_case_id)
        VALUES (?,?,?,?,?,?,?,?)]], { officer.identifier, officer.fullname, toIdentifier, Trim(data.toName or data.to_name, 100), subject, body, data.urgent and 1 or 0, data.refCaseId and ToInt(data.refCaseId) or nil })
    notifyIfOnline(toIdentifier, 'A new telegram awaits at the law office.')
    AuditLog(officer.identifier, officer.fullname, 'sent telegram', 'telegram', id, subject)
    NotifyPlayer(src, 'Telegrama enviado.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:getInbox')
AddEventHandler('daexv_mdt:server:getInbox', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_telegram') then return end
    local officer = GetCharacterData(src)
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_telegrams WHERE to_identifier = ? ORDER BY urgent DESC, created_at DESC', { officer.identifier })
    SendCallback(src, cbId, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:getOutbox')
AddEventHandler('daexv_mdt:server:getOutbox', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_telegram') then return end
    local officer = GetCharacterData(src)
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_telegrams WHERE from_identifier = ? ORDER BY created_at DESC', { officer.identifier })
    SendCallback(src, cbId, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:markTelegramRead')
AddEventHandler('daexv_mdt:server:markTelegramRead', function(telegramId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_telegram') then return end
    local officer = GetCharacterData(src)
    MySQL.update.await('UPDATE daexv_mdt_telegrams SET read_at = COALESCE(read_at, NOW()) WHERE id = ? AND to_identifier = ?', { ToInt(telegramId), officer.identifier })
end)

RegisterNetEvent('daexv_mdt:server:deleteTelegram')
AddEventHandler('daexv_mdt:server:deleteTelegram', function(telegramId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_telegram') then return end
    local officer = GetCharacterData(src)
    MySQL.update.await('DELETE FROM daexv_mdt_telegrams WHERE id = ? AND to_identifier = ?', { ToInt(telegramId), officer.identifier })
    NotifyPlayer(src, 'Telegrama retirado de la bandeja.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:getOfficersList')
AddEventHandler('daexv_mdt:server:getOfficersList', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_telegram') then return end
    local rows = MySQL.query.await('SELECT identifier, name, rank FROM daexv_mdt_officers WHERE duty_status = "active" ORDER BY name', {})
    SendCallback(src, cbId, rows or {})
end)

