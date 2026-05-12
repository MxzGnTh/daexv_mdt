-- sv_evidence.lua - Sistema de evidencias y casquillos (daexv_mdt v2)

local function AppendChainOfCustody(evidenceId, officerName, action)
    local rows = MySQL.query.await("SELECT chain_of_custody FROM daexv_mdt_evidence WHERE id=?", { evidenceId })
    if not rows or #rows == 0 then return end
    local chain = json.decode(rows[1].chain_of_custody or '[]') or {}
    table.insert(chain, { officer = officerName, action = action, timestamp = os.time() })
    MySQL.update.await("UPDATE daexv_mdt_evidence SET chain_of_custody=? WHERE id=?", { json.encode(chain), evidenceId })
end

-- Recolectar evidencia (desde el mundo o desde el MDT)
RegisterNetEvent('daexv_mdt:server:collectEvidence')
AddEventHandler('daexv_mdt:server:collectEvidence', function(data)
    local src = source
    if not HasPermission(src, 'collect_evidence') then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    data = data or {}
    local caseId     = ToInt(data.caseId, 0)
    local evType     = IsAllowedValue(data.type or data.evidenceType, { bullet_casing=true, testimony=true, physical_item=true, photograph=true, fingerprint=true, other=true }, 'other')
    local title      = Trim(tostring(data.title or (evType == 'bullet_casing' and 'Casquillo' or 'Evidencia')), 255)
    local desc       = Trim(tostring(data.description or ''), 1000)
    local locX       = tonumber(data.locationX or data.location_x)
    local locY       = tonumber(data.locationY or data.location_y)
    local locZ       = tonumber(data.locationZ or data.location_z)
    local locName    = Trim(tostring(data.locationName or data.location_name or ''), 200)
    local weaponType = Trim(tostring(data.weaponType or data.weapon_type or ''), 100)
    local linkedId   = ToInt(data.linkedIndividualId, nil)

    if caseId == 0 then
        NotifyPlayer(src, 'Se requiere un ID de expediente valido para adjuntar evidencia.', 5000)
        return
    end

    local verifyCase = MySQL.query.await("SELECT id FROM daexv_mdt_cases WHERE id=?", { caseId })
    if not verifyCase or #verifyCase == 0 then
        NotifyPlayer(src, 'Expediente #' .. caseId .. ' no encontrado.', 5000)
        return
    end

    local initChain = json.encode({ { officer = officer.fullname, action = 'collected', timestamp = os.time() } })

    local newId = MySQL.insert.await(
        "INSERT INTO daexv_mdt_evidence (case_id, evidence_type, title, description, location_x, location_y, location_z, location_name, weapon_type, linked_individual_id, collected_by, collected_by_name, chain_of_custody, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'collected')",
        { caseId, evType, title, desc, locX, locY, locZ, locName, weaponType, linkedId, officer.identifier, officer.fullname, initChain }
    )

    AuditLog(officer.identifier, officer.fullname, 'collect_evidence', 'evidence', newId, evType .. ' | case #' .. caseId)
    NotifyPlayer(src, 'Evidencia #' .. newId .. ' recogida y adjuntada al expediente #' .. caseId .. '.', 5000)

    TriggerClientEvent('daexv_mdt:client:casingCollected', src, { evidenceId = newId, caseId = caseId })
end)

-- Obtener evidencias de un caso
RegisterNetEvent('daexv_mdt:server:getEvidenceForCase')
AddEventHandler('daexv_mdt:server:getEvidenceForCase', function(caseId, cbId)
    local src = source
    if not HasPermission(src, 'view_evidence') then return end

    caseId = ToInt(caseId, 0)
    if caseId == 0 then SendCallback(src, cbId, {}); return end

    local rows = MySQL.query.await("SELECT * FROM daexv_mdt_evidence WHERE case_id=? ORDER BY created_at ASC", { caseId })

    for _, row in ipairs(rows or {}) do
        if row.chain_of_custody and type(row.chain_of_custody) == 'string' then
            row.chain_of_custody = json.decode(row.chain_of_custody) or {}
        end
    end

    SendCallback(src, cbId, rows or {})
end)

-- Adjuntar evidencia a un caso (desde modal MDT)
RegisterNetEvent('daexv_mdt:server:attachEvidenceToCase')
AddEventHandler('daexv_mdt:server:attachEvidenceToCase', function(caseId, data)
    local src = source
    if not HasPermission(src, 'collect_evidence') then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    caseId = ToInt(caseId, 0)
    data   = data or {}

    if caseId == 0 then
        NotifyPlayer(src, 'ID de expediente invalido.', 4000)
        return
    end

    local evType     = IsAllowedValue(data.evidenceType, { bullet_casing=true, testimony=true, physical_item=true, photograph=true, fingerprint=true, other=true }, 'other')
    local title      = Trim(tostring(data.title or 'Evidencia'), 255)
    local desc       = Trim(tostring(data.description or ''), 1000)
    local locName    = Trim(tostring(data.locationName or ''), 200)
    local weaponType = Trim(tostring(data.weaponType or ''), 100)
    local linkedId   = ToInt(data.linkedIndividualId, nil)

    local initChain = json.encode({ { officer = officer.fullname, action = 'attached', timestamp = os.time() } })

    local newId = MySQL.insert.await(
        "INSERT INTO daexv_mdt_evidence (case_id, evidence_type, title, description, location_name, weapon_type, linked_individual_id, collected_by, collected_by_name, chain_of_custody, status) VALUES (?,?,?,?,?,?,?,?,?,?,'in_custody')",
        { caseId, evType, title, desc, locName, weaponType, linkedId, officer.identifier, officer.fullname, initChain }
    )

    AuditLog(officer.identifier, officer.fullname, 'attach_evidence', 'evidence', newId, evType .. ' | case #' .. caseId)
    NotifyPlayer(src, 'Evidencia adjuntada al expediente #' .. caseId .. '.', 4000)
end)

-- Actualizar estado de evidencia
RegisterNetEvent('daexv_mdt:server:updateEvidenceStatus')
AddEventHandler('daexv_mdt:server:updateEvidenceStatus', function(evidenceId, status)
    local src = source
    if not HasPermission(src, 'submit_evidence') then return end

    evidenceId = ToInt(evidenceId, 0)
    status     = IsAllowedValue(status, { collected=true, in_custody=true, submitted=true, analyzed=true, discarded=true }, 'collected')
    if evidenceId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    MySQL.update.await("UPDATE daexv_mdt_evidence SET status=? WHERE id=?", { status, evidenceId })
    AppendChainOfCustody(evidenceId, officer.fullname, 'status_changed:' .. status)

    AuditLog(officer.identifier, officer.fullname, 'update_evidence_status', 'evidence', evidenceId, status)
end)

-- Someter evidencia a juicio
RegisterNetEvent('daexv_mdt:server:submitToCourtEvidence')
AddEventHandler('daexv_mdt:server:submitToCourtEvidence', function(evidenceId)
    local src = source
    if not HasPermission(src, 'submit_evidence') then return end

    evidenceId = ToInt(evidenceId, 0)
    if evidenceId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    MySQL.update.await("UPDATE daexv_mdt_evidence SET submitted_to_court=1, status='submitted' WHERE id=?", { evidenceId })
    AppendChainOfCustody(evidenceId, officer.fullname, 'submitted_to_court')

    AuditLog(officer.identifier, officer.fullname, 'submit_evidence_court', 'evidence', evidenceId, 'Presentada ante la corte')
    NotifyPlayer(src, 'Evidencia #' .. evidenceId .. ' presentada ante la corte.', 4000)
end)

-- Eliminar evidencia (level 3+)
RegisterNetEvent('daexv_mdt:server:removeEvidence')
AddEventHandler('daexv_mdt:server:removeEvidence', function(evidenceId)
    local src = source
    if not HasPermission(src, 'remove_evidence') then return end

    evidenceId = ToInt(evidenceId, 0)
    if evidenceId == 0 then return end

    local officer = GetCharacterData(src)
    if not officer then return end

    local rows = MySQL.query.await("SELECT title, case_id FROM daexv_mdt_evidence WHERE id=?", { evidenceId })
    if not rows or #rows == 0 then
        NotifyPlayer(src, 'Evidencia no encontrada.', 4000)
        return
    end

    MySQL.update.await("UPDATE daexv_mdt_evidence SET status='discarded' WHERE id=?", { evidenceId })
    AuditLog(officer.identifier, officer.fullname, 'remove_evidence', 'evidence', evidenceId, 'Descartada: ' .. (rows[1].title or ''))
    NotifyPlayer(src, 'Evidencia #' .. evidenceId .. ' descartada.', 4000)
end)

-- Registrar casquillo spawneado por cl_evidence (broadcast a oficiales cercanos)
RegisterNetEvent('daexv_mdt:server:spawnCasing')
AddEventHandler('daexv_mdt:server:spawnCasing', function(coords)
    local src = source
    -- Notificar a oficiales del servidor para que su cliente spawne el prop
    TriggerClientEvent('daexv_mdt:client:casingSpawned', -1, {
        spawnedBy = src,
        x = coords and coords.x or 0,
        y = coords and coords.y or 0,
        z = coords and coords.z or 0,
    })
end)


