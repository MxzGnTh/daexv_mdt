local mdtOpen = false
local unpackArgs = table.unpack or unpack

local function sendUi(payloadType, payloadData)
    SendNUIMessage({
        type = payloadType,
        data = payloadData
    })
end

local function closeMdt()
    if not mdtOpen then
        return
    end

    mdtOpen = false
    SetNuiFocus(false, false)
    sendUi('hide', {})
end

RegisterNetEvent('daexv_mdt:open')
AddEventHandler('daexv_mdt:open', function(data)
    mdtOpen = true
    SetNuiFocus(true, true)
    sendUi('open', data or {})
end)

RegisterNetEvent('daexv_mdt:client:fineReceived')
AddEventHandler('daexv_mdt:client:fineReceived', function(fineData)
    sendUi('fineNotification', fineData or {})
end)

RegisterNetEvent('daexv_mdt:client:fineIssued')
AddEventHandler('daexv_mdt:client:fineIssued', function(data)
    sendUi('fineIssued', data or {})
end)

RegisterNetEvent('daexv_mdt:client:finePaid')
AddEventHandler('daexv_mdt:client:finePaid', function(data)
    data = data or {}
    TriggerEvent('vorp:TipRight', 'Fine #' .. tostring(data.fineId or '') .. ' paid: $' .. tostring(data.amount or 0), 5000)
end)

RegisterNetEvent('daexv_mdt:client:myFines')
AddEventHandler('daexv_mdt:client:myFines', function(fines)
    if not fines or #fines == 0 then
        TriggerEvent('vorp:TipRight', 'You have no pending fines.', 5000)
        return
    end

    for _, fine in ipairs(fines) do
        local jurisdiction = tostring(fine.location_display or fine.location or '')
        local locationLabel = jurisdiction ~= '' and (' at ' .. jurisdiction) or ''
        TriggerEvent(
            'vorp:TipRight',
            'Fine #' .. fine.id .. ' - $' .. fine.amount .. ' for ' .. fine.charge .. locationLabel .. ' (' .. fine.status .. '). Use /' .. Config.Fines.PayCommand .. ' ' .. fine.id .. ' cash to pay.',
            8000
        )
        Wait(500)
    end
end)

RegisterCommand(Config.Fines.CitizenCommand, function()
    TriggerServerEvent('daexv_mdt:server:getMyFines')
end, false)

RegisterCommand(Config.Fines.PayCommand, function(_, args)
    args = args or {}
    local fineId = tonumber(args[1])

    if not fineId then
        TriggerEvent('vorp:TipRight', 'Usage: /' .. Config.Fines.PayCommand .. ' [fine_id] cash', 5000)
        return
    end

    if args[2] and string.lower(tostring(args[2])) ~= 'cash' then
        TriggerEvent('vorp:TipRight', 'Only cash payments are enabled right now.', 5000)
        return
    end

    TriggerServerEvent('daexv_mdt:server:payFine', fineId, 'cash')
end, false)

RegisterNUICallback('close', function(_, cb)
    closeMdt()
    cb({})
end)

CreateThread(function()
    while true do
        Wait(0)
        if mdtOpen and IsControlJustReleased(0, 0x156F7119) then
            -- Escape is handled in the NUI. This loop only keeps focus cleanup stable in RedM.
        end
    end
end)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        closeMdt()
    end
end)

local function registerCallback(endpoint, serverEvent, buildArgs)
    RegisterNUICallback(endpoint, function(data, cb)
        data = data or {}
        local cbId = data.cbId or math.random(100000, 999999)
        local eventName = 'daexv_mdt:client:cb_' .. cbId
        local handler

        RegisterNetEvent(eventName)
        handler = AddEventHandler(eventName, function(result)
            sendUi('cb_' .. cbId, result or {})
            if handler then
                RemoveEventHandler(handler)
                handler = nil
            end
        end)

        Citizen.SetTimeout(10000, function()
            if handler then
                RemoveEventHandler(handler)
                handler = nil
            end
        end)

        local argsToSend = buildArgs(data, cbId) or {}
        TriggerServerEvent(serverEvent, unpackArgs(argsToSend))
        cb({})
    end)
end

local function registerAction(endpoint, serverEvent, buildArgs)
    RegisterNUICallback(endpoint, function(data, cb)
        data = data or {}
        local argsToSend = buildArgs(data) or {}
        TriggerServerEvent(serverEvent, unpackArgs(argsToSend))
        cb({ ok = true })
    end)
end

registerCallback('searchIndividuals', 'daexv_mdt:server:searchIndividuals', function(data, cbId) return { data.query or '', cbId } end)
registerCallback('getIndividual', 'daexv_mdt:server:getIndividual', function(data, cbId) return { data.id, cbId } end)
registerAction('createIndividual', 'daexv_mdt:server:createIndividual', function(data) return { data } end)
registerAction('updateIndividual', 'daexv_mdt:server:updateIndividual', function(data) return { data.id, data.payload or data.data or data } end)
registerAction('archiveIndividual', 'daexv_mdt:server:archiveIndividual', function(data) return { data.id } end)
registerAction('setIndividualStatus', 'daexv_mdt:server:setIndividualStatus', function(data) return { data.id, data.status } end)

registerCallback('getCharges', 'daexv_mdt:server:getCharges', function(data, cbId) return { data.individualId or data.id, cbId } end)
registerAction('addCharge', 'daexv_mdt:server:addCharge', function(data) return { data } end)
registerAction('updateChargeStatus', 'daexv_mdt:server:updateChargeStatus', function(data) return { data.chargeId, data.status } end)
registerAction('deleteCharge', 'daexv_mdt:server:deleteCharge', function(data) return { data.chargeId } end)

registerCallback('getWantedList', 'daexv_mdt:server:getWantedList', function(_, cbId) return { cbId } end)
registerAction('createWarrant', 'daexv_mdt:server:createWarrant', function(data) return { data } end)
registerAction('signWarrant', 'daexv_mdt:server:signWarrant', function(data) return { data.warrantId } end)
registerAction('executeWarrant', 'daexv_mdt:server:executeWarrant', function(data) return { data.warrantId } end)
registerAction('cancelWarrant', 'daexv_mdt:server:cancelWarrant', function(data) return { data.warrantId, data.reason } end)

registerCallback('getGangs', 'daexv_mdt:server:getGangs', function(_, cbId) return { cbId } end)
registerCallback('getGang', 'daexv_mdt:server:getGang', function(data, cbId) return { data.id, cbId } end)
registerAction('createGang', 'daexv_mdt:server:createGang', function(data) return { data } end)
registerAction('updateGang', 'daexv_mdt:server:updateGang', function(data) return { data.id, data.payload or data.data or data } end)
registerAction('addGangMember', 'daexv_mdt:server:addGangMember', function(data) return { data.gangId, data.individualId, data.role } end)
registerAction('removeGangMember', 'daexv_mdt:server:removeGangMember', function(data) return { data.memberId } end)

registerCallback('getCases', 'daexv_mdt:server:getCases', function(data, cbId) return { data.filters or {}, data.page or 1, cbId } end)
registerCallback('getCase', 'daexv_mdt:server:getCase', function(data, cbId) return { data.id, cbId } end)
registerAction('createCase', 'daexv_mdt:server:createCase', function(data) return { data } end)
registerAction('updateCase', 'daexv_mdt:server:updateCase', function(data) return { data.id, data.payload or data.data or data } end)
registerAction('updateCaseState', 'daexv_mdt:server:updateCaseState', function(data) return { data.id, data.state } end)
registerAction('archiveCase', 'daexv_mdt:server:archiveCase', function(data) return { data.id } end)

registerCallback('getDashboardStats', 'daexv_mdt:server:getDashboardStats', function(_, cbId) return { cbId } end)
registerCallback('getRecentActivity', 'daexv_mdt:server:getRecentActivity', function(_, cbId) return { cbId } end)

registerAction('sendTelegram', 'daexv_mdt:server:sendTelegram', function(data) return { data } end)
registerCallback('getInbox', 'daexv_mdt:server:getInbox', function(_, cbId) return { cbId } end)
registerCallback('getOutbox', 'daexv_mdt:server:getOutbox', function(_, cbId) return { cbId } end)
registerAction('markTelegramRead', 'daexv_mdt:server:markTelegramRead', function(data) return { data.telegramId } end)
registerAction('deleteTelegram', 'daexv_mdt:server:deleteTelegram', function(data) return { data.telegramId } end)
registerCallback('getOfficersList', 'daexv_mdt:server:getOfficersList', function(_, cbId) return { cbId } end)

registerCallback('getFines', 'daexv_mdt:server:getFines', function(data, cbId) return { data.individualId, cbId } end)
registerAction('issueFine', 'daexv_mdt:server:issueFine', function(data) return { data } end)
registerAction('cancelFine', 'daexv_mdt:server:cancelFine', function(data) return { data.fineId, data.reason } end)
registerAction('waiveFine', 'daexv_mdt:server:waiveFine', function(data) return { data.fineId, data.reason } end)
registerCallback('getFinePresets', 'daexv_mdt:server:getFinePresets', function(_, cbId) return { cbId } end)
registerCallback('getAllFines', 'daexv_mdt:server:getAllFines', function(data, cbId) return { data.filters or {}, data.page or 1, cbId } end)
registerCallback('getFineStats', 'daexv_mdt:server:getFineStats', function(_, cbId) return { cbId } end)

-- Hidden v2 modules remain wired for compatibility, even if the Monroe UI does not expose them yet.
registerAction('registerInmate', 'daexv_mdt:server:registerInmate', function(data) return { data } end)
registerCallback('getInmates', 'daexv_mdt:server:getInmates', function(data, cbId) return { data.filters or {}, data.page or 1, cbId } end)
registerCallback('getInmate', 'daexv_mdt:server:getInmate', function(data, cbId) return { data.inmateId, cbId } end)
registerCallback('calculateBail', 'daexv_mdt:server:calculateBail', function(data, cbId) return { data.individualId, cbId } end)
registerAction('payBailMDT', 'daexv_mdt:server:payBail', function(data) return { data.inmateId, data.method or 'cash' } end)
registerAction('denyBail', 'daexv_mdt:server:denyBail', function(data) return { data.inmateId } end)
registerAction('adjustBail', 'daexv_mdt:server:adjustBail', function(data) return { data.inmateId, data.amount } end)
registerAction('releaseInmate', 'daexv_mdt:server:releaseInmate', function(data) return { data.inmateId, data.releaseType } end)
registerCallback('getInmateStats', 'daexv_mdt:server:getInmateStats', function(_, cbId) return { cbId } end)

registerAction('collectEvidence', 'daexv_mdt:server:collectEvidence', function(data) return { data } end)
registerCallback('getEvidenceForCase', 'daexv_mdt:server:getEvidenceForCase', function(data, cbId) return { data.caseId, cbId } end)
registerAction('attachEvidenceToCase', 'daexv_mdt:server:attachEvidenceToCase', function(data) return { data.caseId, data.payload or data.data or data } end)
registerAction('updateEvidenceStatus', 'daexv_mdt:server:updateEvidenceStatus', function(data) return { data.evidenceId, data.status } end)
registerAction('submitToCourtEvidence', 'daexv_mdt:server:submitToCourtEvidence', function(data) return { data.evidenceId } end)
registerAction('removeEvidence', 'daexv_mdt:server:removeEvidence', function(data) return { data.evidenceId } end)

registerAction('assignLabor', 'daexv_mdt:server:assignLabor', function(data) return { data } end)
registerCallback('getLaborForCitizen', 'daexv_mdt:server:getLaborForCitizen', function(data, cbId) return { data.individualId, cbId } end)
registerAction('updateLaborProgress', 'daexv_mdt:server:updateLaborProgress', function(data) return { data.laborId, data.hours } end)
registerAction('completeLabor', 'daexv_mdt:server:completeLabor', function(data) return { data.laborId } end)
registerAction('failLabor', 'daexv_mdt:server:failLabor', function(data) return { data.laborId } end)
registerAction('cancelLabor', 'daexv_mdt:server:cancelLabor', function(data) return { data.laborId, data.reason } end)
registerCallback('getLaborStats', 'daexv_mdt:server:getLaborStats', function(_, cbId) return { cbId } end)
