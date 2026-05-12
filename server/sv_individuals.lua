RegisterNetEvent('daexv_mdt:server:searchIndividuals')
AddEventHandler('daexv_mdt:server:searchIndividuals', function(query, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_individuals') then return end
    local searchQuery = '%' .. Trim(query, 80) .. '%'
    local results = MySQL.query.await([[SELECT id, identifier, firstname, lastname, aliases, affiliations, description, image_url, status, telegram, created_at
        FROM daexv_mdt_individuals
        WHERE (firstname LIKE ? OR lastname LIKE ? OR aliases LIKE ? OR affiliations LIKE ?) AND status != 'archived'
        ORDER BY lastname ASC LIMIT 20]], { searchQuery, searchQuery, searchQuery, searchQuery })
    SendCallback(src, cbId, results or {})
end)

RegisterNetEvent('daexv_mdt:server:getIndividual')
AddEventHandler('daexv_mdt:server:getIndividual', function(id, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_individuals') then return end
    id = ToInt(id)
    if id <= 0 then SendCallback(src, cbId, nil) return end
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_individuals WHERE id = ? LIMIT 1', { id })
    local individual = rows and rows[1] or nil
    if not individual then SendCallback(src, cbId, nil) return end
    individual.charges = MySQL.query.await('SELECT * FROM daexv_mdt_charges WHERE individual_id = ? ORDER BY created_at DESC', { id }) or {}
    individual.warrants = MySQL.query.await('SELECT * FROM daexv_mdt_warrants WHERE individual_id = ? AND status IN ("pending","active") ORDER BY created_at DESC', { id }) or {}
    local legalRefs = MySQL.query.await('SELECT * FROM daexv_mdt_legal_refs WHERE identifier = ? ORDER BY issued_at DESC', { individual.identifier }) or {}
    individual.legal_refs = legalRefs
    individual.medical_refs = {}
    individual.legal_docs = {}
    for _, ref in ipairs(legalRefs) do
        local docType = tostring(ref.doc_type or ''):lower()
        local docCode = tostring(ref.doc_code or ''):upper()
        local docTitle = tostring(ref.doc_title or ''):lower()
        local docSection = tostring(ref.section or ''):lower()
        local isMedical = docType == 'medical'
            or docSection == 'medical'
            or docTitle:find('medical', 1, true) ~= nil
            or docCode:find('MED', 1, true) ~= nil
        if isMedical then
            individual.medical_refs[#individual.medical_refs + 1] = ref
        else
            individual.legal_docs[#individual.legal_docs + 1] = ref
        end
    end
    individual.gangs = MySQL.query.await([[SELECT gm.*, g.name AS gang_name, g.alias AS gang_alias, g.threat_level
        FROM daexv_mdt_gang_members gm INNER JOIN daexv_mdt_gangs g ON g.id = gm.gang_id
        WHERE gm.individual_id = ? ORDER BY g.name ASC]], { id }) or {}
    SendCallback(src, cbId, individual)
end)

RegisterNetEvent('daexv_mdt:server:createIndividual')
AddEventHandler('daexv_mdt:server:createIndividual', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'create_individual') then return end
    data = data or {}
    local firstname = Trim(data.firstname, 50)
    local lastname = Trim(data.lastname, 50)
    if firstname == '' or lastname == '' then NotifyPlayer(src, 'Nombre y apellido son obligatorios.', 3500) return end
    local officer = GetCharacterData(src)
    local identifier = Trim(data.identifier, 60)
    if identifier == '' then identifier = 'mdt-' .. tostring(os.time()) .. '-' .. tostring(math.random(1000, 9999)) end
    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_individuals
        (identifier, firstname, lastname, dob, description, image_url, aliases, affiliations, telegram, status, known_associates, notes, created_by, created_by_name)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)]], {
        identifier, firstname, lastname, Trim(data.dob, 20), Trim(data.description, 4000), Trim(data.image_url, 500),
        Trim(data.aliases, 255), Trim(data.affiliations, 255), Trim(data.telegram, 50), IsAllowedValue(data.status, DaexvMDTEnums.statuses, 'clear'),
        Trim(data.known_associates, 4000), Trim(data.notes, 4000), officer.identifier, officer.fullname
    })
    AuditLog(officer.identifier, officer.fullname, 'created individual', 'individual', id, firstname .. ' ' .. lastname)
    NotifyPlayer(src, 'Ficha ciudadana creada.', 3500)
end)

RegisterNetEvent('daexv_mdt:server:updateIndividual')
AddEventHandler('daexv_mdt:server:updateIndividual', function(id, data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'edit_individual') then return end
    id = ToInt(id)
    data = data or {}
    local firstname = Trim(data.firstname, 50)
    local lastname = Trim(data.lastname, 50)
    if id <= 0 or firstname == '' or lastname == '' then NotifyPlayer(src, 'Se requiere ID de ficha y nombre ciudadano valido.', 3500) return end
    local officer = GetCharacterData(src)
    MySQL.update.await([[UPDATE daexv_mdt_individuals SET firstname=?, lastname=?, dob=?, aliases=?, affiliations=?, telegram=?, description=?, image_url=?, notes=?, known_associates=?, status=?, updated_by=?, updated_by_name=? WHERE id=?]], {
        firstname, lastname, Trim(data.dob, 20), Trim(data.aliases, 255), Trim(data.affiliations, 255), Trim(data.telegram, 50), Trim(data.description, 4000), Trim(data.image_url, 500),
        Trim(data.notes, 4000), Trim(data.known_associates, 4000), IsAllowedValue(data.status, DaexvMDTEnums.statuses, 'clear'), officer.identifier, officer.fullname, id
    })
    AuditLog(officer.identifier, officer.fullname, 'updated individual', 'individual', id, firstname .. ' ' .. lastname)
    NotifyPlayer(src, 'Ficha ciudadana actualizada.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:archiveIndividual')
AddEventHandler('daexv_mdt:server:archiveIndividual', function(id)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'archive_individual') then return end
    id = ToInt(id)
    if id <= 0 then return end
    local officer = GetCharacterData(src)
    MySQL.update.await('UPDATE daexv_mdt_individuals SET status="archived", updated_by=?, updated_by_name=? WHERE id=?', { officer.identifier, officer.fullname, id })
    MySQL.update.await('UPDATE daexv_mdt_warrants SET status="cancelled", cancelled_reason="Citizen file archived" WHERE individual_id=? AND status IN ("pending","active")', { id })
    AuditLog(officer.identifier, officer.fullname, 'archived individual', 'individual', id, '')
    NotifyPlayer(src, 'Ficha ciudadana archivada.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:setIndividualStatus')
AddEventHandler('daexv_mdt:server:setIndividualStatus', function(id, status)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'edit_individual') then return end
    id = ToInt(id)
    status = IsAllowedValue(status, DaexvMDTEnums.statuses, 'clear')
    local officer = GetCharacterData(src)
    MySQL.update.await('UPDATE daexv_mdt_individuals SET status=?, updated_by=?, updated_by_name=? WHERE id=?', { status, officer.identifier, officer.fullname, id })
    if status == 'deceased' then
        MySQL.update.await('UPDATE daexv_mdt_warrants SET status="cancelled", cancelled_reason="Subject deceased" WHERE individual_id=? AND status IN ("pending","active")', { id })
    end
    AuditLog(officer.identifier, officer.fullname, 'set individual status', 'individual', id, status)
    NotifyPlayer(src, 'Estado ciudadano actualizado.', 3000)
end)

