RegisterNetEvent('daexv_mdt:server:searchIndividuals')
AddEventHandler('daexv_mdt:server:searchIndividuals', function(query, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_individuals') then return end

    local cleanQuery = Trim(query, 80)
    local searchQuery = '%' .. cleanQuery .. '%'
    local response = {}
    local seen = {}

    local function pushResult(row)
        if type(row) ~= 'table' then return end
        local key = tostring(row.source or 'row') .. ':' .. tostring(row.individual_id or row.char_id or row.id or row.identifier or math.random(1000, 9999))
        if seen[key] then return end
        seen[key] = true
        response[#response + 1] = row
    end

    local mdtResults = MySQL.query.await([[SELECT i.id AS individual_id, i.id, i.char_id, i.identifier, i.firstname, i.lastname,
        i.aliases, i.affiliations, i.description, i.image_url, i.status, i.telegram, i.created_at,
        c.job AS current_job
        FROM daexv_mdt_individuals i
        LEFT JOIN characters c ON c.charidentifier = i.char_id
        WHERE (i.firstname LIKE ? OR i.lastname LIKE ? OR i.aliases LIKE ? OR i.affiliations LIKE ?)
          AND i.status != 'archived'
        ORDER BY i.lastname ASC, i.firstname ASC
        LIMIT 20]], { searchQuery, searchQuery, searchQuery, searchQuery }) or {}

    for _, row in ipairs(mdtResults) do
        pushResult({
            id = row.individual_id,
            individual_id = row.individual_id,
            char_id = row.char_id and ToInt(row.char_id, 0) or nil,
            identifier = tostring(row.identifier or ''),
            firstname = Trim(row.firstname, 50),
            lastname = Trim(row.lastname, 50),
            aliases = Trim(row.aliases, 255),
            affiliations = Trim(row.affiliations, 255),
            description = Trim(row.description, 4000),
            image_url = Trim(row.image_url, 500),
            status = tostring(row.status or 'clear'),
            telegram = Trim(row.telegram, 50),
            created_at = row.created_at,
            job = Trim(row.current_job or '', 50),
            source = 'mdt',
            hasFile = true,
            source_label = 'FICHA MDT',
        })
    end

    local okCharacters, characterResults = pcall(function()
        return MySQL.query.await([[SELECT c.charidentifier, c.identifier AS account_identifier, c.firstname, c.lastname, c.job,
            i.id AS individual_id, i.status AS individual_status, i.description AS individual_description, i.image_url AS individual_image,
            i.aliases AS individual_aliases, i.affiliations AS individual_affiliations, i.telegram AS individual_telegram,
            i.created_at AS individual_created_at
            FROM characters c
            LEFT JOIN daexv_mdt_individuals i ON (i.char_id = c.charidentifier OR i.identifier = CAST(c.charidentifier AS CHAR(60))) AND i.status != 'archived'
            WHERE (c.firstname LIKE ? OR c.lastname LIKE ?)
            ORDER BY c.lastname ASC, c.firstname ASC
            LIMIT 20]], { searchQuery, searchQuery }) or {}
    end)

    if okCharacters and type(characterResults) == 'table' then
        for _, row in ipairs(characterResults) do
            local hasFile = row.individual_id ~= nil
            pushResult({
                id = hasFile and row.individual_id or nil,
                individual_id = hasFile and row.individual_id or nil,
                char_id = ToInt(row.charidentifier, 0),
                identifier = tostring(row.charidentifier or row.account_identifier or ''),
                firstname = Trim(row.firstname, 50),
                lastname = Trim(row.lastname, 50),
                aliases = Trim(row.individual_aliases, 255),
                affiliations = Trim(row.individual_affiliations, 255),
                description = hasFile and Trim(row.individual_description, 4000)
                    or ('Personaje registrado en el servidor. Oficio actual: ' .. Trim(row.job or 'sin oficio', 50) .. '. ID: ' .. tostring(row.charidentifier or 'N/D')),
                image_url = Trim(row.individual_image, 500),
                status = hasFile and tostring(row.individual_status or 'clear') or '',
                telegram = Trim(row.individual_telegram, 50),
                created_at = row.individual_created_at,
                job = Trim(row.job or '', 50),
                source = hasFile and 'mdt' or 'character',
                hasFile = hasFile,
                source_label = hasFile and 'FICHA MDT' or 'PERSONAJE DEL SERVIDOR',
            })
        end
    end

    table.sort(response, function(a, b)
        local aHas = a.hasFile and 1 or 0
        local bHas = b.hasFile and 1 or 0
        if aHas ~= bHas then return aHas > bHas end
        local aLast = string.lower(tostring(a.lastname or ''))
        local bLast = string.lower(tostring(b.lastname or ''))
        if aLast ~= bLast then return aLast < bLast end
        return string.lower(tostring(a.firstname or '')) < string.lower(tostring(b.firstname or ''))
    end)

    if #response > 20 then
        while #response > 20 do table.remove(response) end
    end

    SendCallback(src, cbId, response)
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

    local linkedCharId = ToInt(individual.char_id or individual.identifier, 0)
    local character = nil
    if linkedCharId > 0 then
        local charRows = MySQL.query.await('SELECT charidentifier, identifier, firstname, lastname, job FROM characters WHERE charidentifier = ? LIMIT 1', { linkedCharId }) or {}
        character = charRows[1]
        if character and (not individual.char_id or ToInt(individual.char_id, 0) <= 0) then
            individual.char_id = ToInt(character.charidentifier, 0)
        end
    end

    individual.charges = MySQL.query.await('SELECT * FROM daexv_mdt_charges WHERE individual_id = ? ORDER BY created_at DESC', { id }) or {}
    individual.warrants = MySQL.query.await('SELECT * FROM daexv_mdt_warrants WHERE individual_id = ? AND status IN ("pending","active") ORDER BY created_at DESC', { id }) or {}
    individual.fines = MySQL.query.await('SELECT * FROM daexv_mdt_fines WHERE individual_id = ? ORDER BY FIELD(status,"overdue","pending","paid","cancelled","waived"), created_at DESC', { id }) or {}
    for _, fine in ipairs(individual.fines) do
        fine.jurisdiction = BuildFineJurisdiction(fine.state_name, fine.county_name, fine.town_name)
        fine.location_display = BuildFineLocationDisplay(fine.state_name, fine.county_name, fine.town_name, fine.location_detail, fine.location)
    end
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

    individual.source = 'mdt'
    individual.hasFile = true
    individual.currentJob = character and tostring(character.job or '') or ''
    individual.online = FindOnlinePlayerByIdentifier(tostring(individual.char_id or individual.identifier or '')) ~= nil

    SendCallback(src, cbId, individual)
end)

RegisterNetEvent('daexv_mdt:server:createIndividual')
AddEventHandler('daexv_mdt:server:createIndividual', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'create_individual') then return end
    data = data or {}

    local officer = GetCharacterData(src)
    local charId = ToInt(data.char_id or data.charId, 0)
    local firstname = Trim(data.firstname, 50)
    local lastname = Trim(data.lastname, 50)
    local identifier = Trim(data.identifier, 60)
    local character = nil

    if charId > 0 then
        local charRows = MySQL.query.await('SELECT charidentifier, identifier, firstname, lastname, job FROM characters WHERE charidentifier = ? LIMIT 1', { charId }) or {}
        character = charRows[1]
        if not character then
            NotifyPlayer(src, 'No se encontro ese personaje registrado en el servidor.', 3500)
            return
        end

        local existing = MySQL.query.await('SELECT id, firstname, lastname FROM daexv_mdt_individuals WHERE char_id = ? OR identifier = ? LIMIT 1', { charId, tostring(charId) }) or {}
        if existing[1] then
            NotifyPlayer(src, 'Ese personaje ya posee una ficha MDT asentada.', 4000)
            return
        end

        if firstname == '' then firstname = Trim(character.firstname, 50) end
        if lastname == '' then lastname = Trim(character.lastname, 50) end
        if identifier == '' then identifier = tostring(character.charidentifier) end
    end

    if firstname == '' or lastname == '' then
        NotifyPlayer(src, 'Nombre y apellido son obligatorios.', 3500)
        return
    end

    if identifier == '' then
        identifier = 'mdt-' .. tostring(os.time()) .. '-' .. tostring(math.random(1000, 9999))
    end

    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_individuals
        (char_id, identifier, firstname, lastname, dob, description, image_url, aliases, affiliations, telegram, status, known_associates, notes, created_by, created_by_name)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)]], {
        charId > 0 and charId or nil,
        identifier,
        firstname,
        lastname,
        Trim(data.dob, 20),
        Trim(data.description or data.notes, 4000),
        Trim(data.image_url, 500),
        Trim(data.aliases, 255),
        Trim(data.affiliations, 255),
        Trim(data.telegram, 50),
        IsAllowedValue(data.status, DaexvMDTEnums.statuses, 'clear'),
        Trim(data.known_associates, 4000),
        Trim(data.notes, 4000),
        officer.identifier,
        officer.fullname
    })

    AuditLog(officer.identifier, officer.fullname, 'created individual', 'individual', id, firstname .. ' ' .. lastname)
    NotifyPlayer(src, charId > 0 and 'Ficha ciudadana creada desde personaje del servidor.' or 'Ficha ciudadana creada.', 3500)
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
