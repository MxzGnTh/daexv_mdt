-- cl_fines.lua - Comandos de multas y fianzas para ciudadanos (daexv_mdt v2)
-- Los comandos /fines y /payfine del cl_main.lua se mantienen alli.
-- Este archivo agrega los comandos de fianza.

RegisterCommand(Config.Bail.BailPayCommand, function(_, args)
    args = args or {}
    local inmateId = tonumber(args[1])
    local method   = args[2] or 'cash'

    if not inmateId then
        TriggerEvent('vorp:TipRight', 'Uso: /' .. Config.Bail.BailPayCommand .. ' [id_recluso] [cash/bank]', 5000)
        return
    end

    method = (method == 'bank') and 'bank' or 'cash'
    TriggerServerEvent('daexv_mdt:server:payBail', inmateId, method)
end, false)

RegisterCommand(Config.Bail.BailViewCommand, function(_, args)
    args = args or {}
    local inmateId = tonumber(args[1])

    if not inmateId then
        TriggerEvent('vorp:TipRight', 'Uso: /' .. Config.Bail.BailViewCommand .. ' [id_recluso]', 5000)
        return
    end

    TriggerServerEvent('daexv_mdt:server:getInmateForCitizen', inmateId)
end, false)

-- Recibir notificacion de fianza establecida (popup en NUI)
RegisterNetEvent('daexv_mdt:client:bailSet')
AddEventHandler('daexv_mdt:client:bailSet', function(data)
    data = data or {}
    SendNUIMessage({ type = 'bailNotification', data = data })
end)

-- Recibir confirmacion de fianza pagada
RegisterNetEvent('daexv_mdt:client:bailPaid')
AddEventHandler('daexv_mdt:client:bailPaid', function(data)
    data = data or {}
    TriggerEvent('vorp:TipRight', 'Fianza pagada. Ya puedes retirarte.', 6000)
    SendNUIMessage({ type = 'bailPaid', data = data })
end)

-- Consulta ciudadano a su propio inmate record
RegisterNetEvent('daexv_mdt:server:getInmateForCitizen')
-- (el servidor responde con vorp:TipRight si no es MDT)
RegisterNetEvent('daexv_mdt:client:inmateInfo')
AddEventHandler('daexv_mdt:client:inmateInfo', function(data)
    data = data or {}
    if not data.id then
        TriggerEvent('vorp:TipRight', 'No se encontro un registro activo de reclusion.', 5000)
        return
    end
    local status = data.bail_status or 'unknown'
    local amount = data.bail_amount or 0
    local msg = 'Inmate #' .. data.id .. ' | Bail: $' .. amount .. ' (' .. status .. ')'
    if status == 'available' then
        msg = msg .. ' | Pay with /' .. Config.Bail.BailPayCommand .. ' ' .. data.id
    elseif status == 'denied' then
        msg = msg .. ' | BAIL DENIED'
    end
    TriggerEvent('vorp:TipRight', msg, 8000)
end)
