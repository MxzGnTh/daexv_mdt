-- sv_labor.lua - Sistema de trabajos forzados y comunitarios (daexv_mdt v2)

-- Thread que falla trabajos con deadline expirado
CreateThread(function()
    while true do
        Wait(600000) -- cada 10 minutos
        MySQL.update(
            "UPDATE daexv_mdt_labor SET status='failed' WHERE deadline IS NOT NULL AND deadline < NOW() AND status IN ('assigned','in_progress')",
            {}
        )
    end
end)

-- Asignar trabajo
RegisterNetEvent('daexv_mdt:server:assignLabor')
AddEventHandler('daexv_mdt:server:assignLabor', function(data)
    local src = source
    if not HasPermission(src, 'assign_labor') then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    data = data or {}
    local individualId = ToInt(data.individualId, 0)
    local citizenId    = Trim(tostring(data.citizenIdentifier or ''), 60)
    local citizenName  = Trim(tostring(data.citizenName or 'Unknown'), 100)
    local laborType    = IsAllowedValue(data.laborType, { community_service=true, forced_labor=true, fine_and_labor=true }, 'community_service')
    local description  = Trim(tostring(data.description or ''), 1000)
    local hours        = ToInt(data.hoursAssigned, 1)
    local deadline     = data.deadline
    local caseRefId    = ToInt(data.caseRefId, nil)
    local chargeRefId  = ToInt(data.chargeRefId, nil)
    local fineRefId    = ToInt(data.fineRefId, nil)
    local notes        = Trim(tostring(data.notes or ''), 500)

    if individualId == 0 then
        NotifyPlayer(src, 'ID de ciudadano invalido.', 4000)
        return
    end
    if hours < 1 then hours = 1 end
    if hours > 500 then hours = 500 end

    local deadlineVal = nil
    if deadline and deadline ~= '' then
        deadlineVal = tostring(deadline)
    end

    local newId = MySQL.insert.await(
        "INSERT INTO daexv_mdt_labor (individual_id, citizen_identifier, citizen_name, labor_type, description, hours_assigned, deadline, assigned_by, assigned_by_name, case_ref_id, charge_ref_id, fine_ref_id, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        { individualId, citizenId, citizenName, laborType, description, hours, deadlineVal, officer.identifier, officer.fullname, caseRefId, chargeRefId, fineRefId, notes }
    )

    AuditLog(officer.identifier, officer.fullname, 'assign_labor', 'labor', newId, laborType .. ' | ' .. hours .. 'h | ' .. citizenName)
    NotifyPlayer(src, 'Trabajo asignado: ' .. hours .. ' horas de ' .. laborType .. ' para ' .. citizenName .. '.', 5000)

    local targetSrc = FindOnlinePlayerByIdentifier(citizenId)
    if targetSrc then
        TriggerClientEvent('vorp:TipRight', targetSrc, 'Se te asignaron ' .. hours .. ' horas de ' .. laborType:gsub('_', ' ') .. '.', 7000)
    end
end)

-- Obtener trabajos de un ciudadano
RegisterNetEvent('daexv_mdt:server:getLaborForCitizen')
AddEventHandler('daexv_mdt:server:getLaborForCitizen', function(individualId, cbId)
    local src = source
    if not HasPermission(src, 'view_individuals') then return end

    individualId = ToInt(individualId, 0)
    if individualId == 0 then SendCallback(src, cbId, {}); return end

    local rows = MySQL.query.await(
        "SELECT * FROM daexv_mdt_labor WHERE individual_id=? ORDER BY created_at DESC LIMIT 50",
        { individualId }
    )

    SendCallback(src, cbId, rows or {})
end)

-- Actualizar progreso de trabajo
RegisterNetEvent('daexv_mdt:server:updateLaborProgress')
AddEventHandler('daexv_mdt:server:updateLaborProgress', function(laborId, hoursToAdd)
    local src = source
    if not HasPermission(src, 'assign_labor') then return end

    laborId    = ToInt(laborId, 0)
    hoursToAdd = ToInt(hoursToAdd, 1)
    if laborId == 0 or hoursToAdd < 1 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    local rows = MySQL.query.await("SELECT * FROM daexv_mdt_labor WHERE id=? AND status IN ('assigned','in_progress')", { laborId })
    if not rows or #rows == 0 then
        NotifyPlayer(src, 'Registro de trabajo no encontrado o ya completado.', 4000)
        return
    end

    local labor      = rows[1]
    local completed  = (tonumber(labor.hours_completed) or 0) + hoursToAdd
    local assigned   = tonumber(labor.hours_assigned) or 1
    local newStatus  = 'in_progress'
    local completedAt = nil

    if completed >= assigned then
        completed   = assigned
        newStatus   = 'completed'
        completedAt = 'NOW()'
    end

    if newStatus == 'completed' then
        MySQL.update.await(
            "UPDATE daexv_mdt_labor SET hours_completed=?, status='completed', completed_at=NOW() WHERE id=?",
            { completed, laborId }
        )
        NotifyPlayer(src, 'Trabajo #' .. laborId .. ' completado.', 4000)

        local targetSrc = FindOnlinePlayerByIdentifier(labor.citizen_identifier)
        if targetSrc then
            TriggerClientEvent('vorp:TipRight', targetSrc, 'Tu trabajo asignado ha sido completado.', 6000)
        end
    else
        MySQL.update.await(
            "UPDATE daexv_mdt_labor SET hours_completed=?, status='in_progress' WHERE id=?",
            { completed, laborId }
        )
        NotifyPlayer(src, 'Progreso de trabajo: ' .. completed .. '/' .. assigned .. ' horas.', 4000)
    end

    AuditLog(officer.identifier, officer.fullname, 'update_labor_progress', 'labor', laborId, '+' .. hoursToAdd .. 'h | ' .. completed .. '/' .. assigned)
end)

-- Completar trabajo manualmente
RegisterNetEvent('daexv_mdt:server:completeLabor')
AddEventHandler('daexv_mdt:server:completeLabor', function(laborId)
    local src = source
    if not HasPermission(src, 'manage_labor') then return end

    laborId = ToInt(laborId, 0)
    if laborId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    local rows = MySQL.query.await("SELECT citizen_identifier, citizen_name, hours_assigned FROM daexv_mdt_labor WHERE id=?", { laborId })
    if not rows or #rows == 0 then return end

    MySQL.update.await(
        "UPDATE daexv_mdt_labor SET status='completed', hours_completed=hours_assigned, completed_at=NOW() WHERE id=?",
        { laborId }
    )

    AuditLog(officer.identifier, officer.fullname, 'complete_labor', 'labor', laborId, 'Manually completed')
    NotifyPlayer(src, 'Trabajo #' .. laborId .. ' marcado como completado.', 4000)

    local targetSrc = FindOnlinePlayerByIdentifier(rows[1].citizen_identifier)
    if targetSrc then
        TriggerClientEvent('vorp:TipRight', targetSrc, 'Tu trabajo asignado ha sido completado.', 6000)
    end
end)

-- Fallar trabajo
RegisterNetEvent('daexv_mdt:server:failLabor')
AddEventHandler('daexv_mdt:server:failLabor', function(laborId)
    local src = source
    if not HasPermission(src, 'manage_labor') then return end

    laborId = ToInt(laborId, 0)
    if laborId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    MySQL.update.await("UPDATE daexv_mdt_labor SET status='failed' WHERE id=?", { laborId })
    AuditLog(officer.identifier, officer.fullname, 'fail_labor', 'labor', laborId, 'Marked failed')
    NotifyPlayer(src, 'Trabajo #' .. laborId .. ' marcado como fallido.', 4000)
end)

-- Cancelar trabajo
RegisterNetEvent('daexv_mdt:server:cancelLabor')
AddEventHandler('daexv_mdt:server:cancelLabor', function(laborId, reason)
    local src = source
    if not HasPermission(src, 'manage_labor') then return end

    laborId = ToInt(laborId, 0)
    reason  = Trim(tostring(reason or 'No reason provided'), 300)
    if laborId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    MySQL.update.await("UPDATE daexv_mdt_labor SET status='cancelled', notes=CONCAT(IFNULL(notes,''),' | Cancelled: " .. "', ?) WHERE id=?", { reason, laborId })
    AuditLog(officer.identifier, officer.fullname, 'cancel_labor', 'labor', laborId, reason)
    NotifyPlayer(src, 'Trabajo #' .. laborId .. ' cancelado.', 4000)
end)

-- Estadisticas de trabajos (para dashboard)
RegisterNetEvent('daexv_mdt:server:getLaborStats')
AddEventHandler('daexv_mdt:server:getLaborStats', function(cbId)
    local src = source
    if not HasPermission(src, 'view_dashboard') then return end

    local active    = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_labor WHERE status IN ('assigned','in_progress')", {})
    local completed = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_labor WHERE status='completed'", {})
    local failed    = MySQL.query.await("SELECT COUNT(*) as n FROM daexv_mdt_labor WHERE status='failed'", {})
    local totalHrs  = MySQL.query.await("SELECT COALESCE(SUM(hours_assigned),0) as total FROM daexv_mdt_labor WHERE status IN ('assigned','in_progress')", {})
    local doneHrs   = MySQL.query.await("SELECT COALESCE(SUM(hours_completed),0) as total FROM daexv_mdt_labor WHERE status IN ('assigned','in_progress','completed')", {})

    SendCallback(src, cbId, {
        active       = (active[1]    and active[1].n)       or 0,
        completed    = (completed[1] and completed[1].n)    or 0,
        failed       = (failed[1]    and failed[1].n)       or 0,
        totalHours   = (totalHrs[1]  and totalHrs[1].total) or 0,
        doneHours    = (doneHrs[1]   and doneHrs[1].total)  or 0,
    })
end)


