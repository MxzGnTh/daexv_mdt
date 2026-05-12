RegisterNetEvent('daexv_mdt:server:getCharges')
AddEventHandler('daexv_mdt:server:getCharges', function(individualId, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_charges') then return end
    local results = MySQL.query.await('SELECT * FROM daexv_mdt_charges WHERE individual_id = ? ORDER BY created_at DESC', { ToInt(individualId) })
    SendCallback(src, cbId, results or {})
end)

RegisterNetEvent('daexv_mdt:server:addCharge')
AddEventHandler('daexv_mdt:server:addCharge', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'add_charge') then return end
    data = data or {}
    local individualId = ToInt(data.individualId or data.individual_id)
    local charge = Trim(data.charge, 255)
    if individualId <= 0 or charge == '' then NotifyPlayer(src, 'Ciudadano y cargo son obligatorios.', 3500) return end
    local officer = GetCharacterData(src)
    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_charges
        (individual_id, officer_identifier, officer_name, charge, penal_code, category, description, sentence_time, fine, plea, case_ref_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)]], {
        individualId, officer.identifier, officer.fullname, charge, Trim(data.penalCode or data.penal_code, 20), Trim(data.category, 50),
        Trim(data.description, 4000), ToInt(data.sentenceTime or data.sentence_time), ToInt(data.fine), IsAllowedValue(data.plea, DaexvMDTEnums.plea, 'no_plea'),
        data.caseRefId and ToInt(data.caseRefId) or data.case_ref_id and ToInt(data.case_ref_id) or nil
    })
    AuditLog(officer.identifier, officer.fullname, 'added charge', 'charge', id, charge)
    NotifyPlayer(src, 'Cargo agregado al historial.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:updateChargeStatus')
AddEventHandler('daexv_mdt:server:updateChargeStatus', function(chargeId, status)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'edit_charge') then return end
    chargeId = ToInt(chargeId)
    status = IsAllowedValue(status, DaexvMDTEnums.chargeStatus, 'open')
    MySQL.update.await('UPDATE daexv_mdt_charges SET status = ? WHERE id = ?', { status, chargeId })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'updated charge status', 'charge', chargeId, status)
    NotifyPlayer(src, 'Estado del cargo actualizado.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:deleteCharge')
AddEventHandler('daexv_mdt:server:deleteCharge', function(chargeId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'delete_charge') then return end
    chargeId = ToInt(chargeId)
    MySQL.update.await('DELETE FROM daexv_mdt_charges WHERE id = ?', { chargeId })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'deleted charge', 'charge', chargeId, '')
    NotifyPlayer(src, 'Cargo eliminado.', 3000)
end)

