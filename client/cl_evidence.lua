-- cl_evidence.lua - Deteccion de casquillos y recoleccion de evidencia en el mundo (daexv_mdt v2)

local spawnedCasings = {}
-- Cada entrada: { coords = vector3, prop = entity, spawnTime = number }

local CASING_PROP  = 'prop_cs_bucket'  -- prop pequeno placeholder (RedM compatible)
local lastShotTime = 0

-- Thread: detectar cuando el jugador local dispara y spawnar un casquillo
CreateThread(function()
    while true do
        Wait(0)
        local ped = PlayerPedId()
        if IsPedShooting(ped) then
            local now = GetGameTimer()
            if now - lastShotTime > 300 then  -- evitar spam: max 1 casquillo cada 300ms
                lastShotTime = now
                local coords = GetEntityCoords(ped)
                local groundZ = coords.z - 0.9
                TriggerServerEvent('daexv_mdt:server:spawnCasing', { x = coords.x, y = coords.y, z = groundZ })
            end
        end
    end
end)

-- Spawn local de casquillo al recibirlo del servidor
RegisterNetEvent('daexv_mdt:client:casingSpawned')
AddEventHandler('daexv_mdt:client:casingSpawned', function(data)
    if not data then return end

    local coords = vector3(data.x or 0.0, data.y or 0.0, data.z or 0.0)
    local propHash = GetHashKey(CASING_PROP)

    RequestModel(propHash)
    local waited = 0
    while not HasModelLoaded(propHash) and waited < 3000 do
        Wait(50)
        waited = waited + 50
    end
    if not HasModelLoaded(propHash) then return end

    local prop = CreateObjectNoOffset(propHash, coords.x, coords.y, coords.z, false, false, false)
    if DoesEntityExist(prop) then
        SetEntityAsMissionEntity(prop, false, true)
        FreezeEntityPosition(prop, true)
        table.insert(spawnedCasings, {
            coords    = coords,
            prop      = prop,
            spawnTime = GetGameTimer(),
        })
    end
    SetModelAsNoLongerNeeded(propHash)
end)

-- Thread: limpiar casquillos expirados cada minuto
CreateThread(function()
    while true do
        Wait(60000)
        local now      = GetGameTimer()
        local lifetime = Config.Evidence.CasingLifetime * 60000

        for i = #spawnedCasings, 1, -1 do
            if now - spawnedCasings[i].spawnTime > lifetime then
                if DoesEntityExist(spawnedCasings[i].prop) then
                    DeleteEntity(spawnedCasings[i].prop)
                end
                table.remove(spawnedCasings, i)
            end
        end
    end
end)

-- Thread: proximidad - permitir recoger casquillos
CreateThread(function()
    while true do
        Wait(500)
        local ped      = PlayerPedId()
        local coords   = GetEntityCoords(ped)
        local nearest  = nil
        local nearDist = Config.Evidence.CollectionRadius + 0.1

        for _, casing in ipairs(spawnedCasings) do
            local dist = #(coords - casing.coords)
            if dist < nearDist then
                nearest  = casing
                nearDist = dist
            end
        end

        if nearest then
            -- Dibujar texto de prompt
            DrawText3D(nearest.coords.x, nearest.coords.y, nearest.coords.z + 0.3, '[E] Collect Evidence')

            if IsControlJustReleased(0, 0x760A9C6F) then  -- INPUT_CONTEXT (E)
                -- Verificar item si es requerido
                if Config.Evidence.RequireEvidenceBag then
                    local hasItem = exports.vorp_inventory:vorp_inventoryApi().HasItem(GetPlayerServerId(PlayerId()), Config.Evidence.EvidenceBagItem, 1)
                    if not hasItem then
                        TriggerEvent('vorp:TipRight', 'Necesitas ' .. Config.Evidence.EvidenceBagItem .. ' para recoger evidencia.', 4000)
                        goto continue
                    end
                end

                TriggerServerEvent('daexv_mdt:server:collectEvidence', {
                    type        = 'bullet_casing',
                    title       = 'Bullet Casing',
                    description = 'A bullet casing found at the scene.',
                    locationX   = nearest.coords.x,
                    locationY   = nearest.coords.y,
                    locationZ   = nearest.coords.z,
                    caseId      = 0,  -- requiere adjuntar al caso desde el MDT
                })

                -- Eliminar prop local inmediatamente
                if DoesEntityExist(nearest.prop) then
                    DeleteEntity(nearest.prop)
                end
                for i = #spawnedCasings, 1, -1 do
                    if spawnedCasings[i] == nearest then
                        table.remove(spawnedCasings, i)
                        break
                    end
                end

                TriggerEvent('vorp:TipRight', 'Evidencia recogida. Adjuntala a un caso desde el MDT.', 5000)
            end

            ::continue::
        end
    end
end)

-- Limpieza al detener el recurso
AddEventHandler('onResourceStop', function(resourceName)
    if resourceName ~= GetCurrentResourceName() then return end
    for _, casing in ipairs(spawnedCasings) do
        if DoesEntityExist(casing.prop) then
            DeleteEntity(casing.prop)
        end
    end
    spawnedCasings = {}
end)

-- Funcion auxiliar para DrawText3D (texto flotante en el mundo)
function DrawText3D(x, y, z, text)
    local onScreen, screenX, screenY = World3dToScreen2d(x, y, z)
    if onScreen then
        SetTextScale(0.35, 0.35)
        SetTextFont(4)
        SetTextProportional(1)
        SetTextColour(255, 255, 255, 215)
        SetTextEntry('STRING')
        SetTextCentre(true)
        AddTextComponentString(text)
        DrawText(screenX, screenY)
        local factor = string.len(text) / 370
        DrawRect(screenX, screenY + 0.0125, 0.015 + factor, 0.03, 41, 11, 41, 68)
    end
end
