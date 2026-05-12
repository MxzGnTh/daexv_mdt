local function validCaseType(value)
    value = tostring(value or 'case_file')
    for _, row in ipairs(Config.CaseTypes or {}) do if row.id == value then return value end end
    return 'case_file'
end

local function validCaseState(value)
    value = tostring(value or 'open')
    for _, row in ipairs(Config.CaseStates or {}) do if row.id == value then return value end end
    return 'open'
end

local function insertCaseChildren(caseId, incidents, charges)
    for index, incident in ipairs(incidents or {}) do
        MySQL.insert.await('INSERT INTO daexv_mdt_case_incidents (case_id, title, location, date, details, sort_order) VALUES (?,?,?,?,?,?)', {
            caseId, Trim(incident.title, 255), Trim(incident.location, 200), Trim(incident.date, 50), Trim(incident.details, 4000), ToInt(incident.sort_order or index)
        })
    end
    for _, charge in ipairs(charges or {}) do
        MySQL.insert.await('INSERT INTO daexv_mdt_case_charges (case_id, charge_name, penal_code, category, plea, sentence_time, fine) VALUES (?,?,?,?,?,?,?)', {
            caseId, Trim(charge.charge_name or charge.chargeName or charge.name, 255), Trim(charge.penal_code or charge.penalCode, 20), Trim(charge.category, 50), IsAllowedValue(charge.plea, DaexvMDTEnums.plea, 'no_plea'), ToInt(charge.sentence_time or charge.sentenceTime), ToInt(charge.fine)
        })
    end
end

RegisterNetEvent('daexv_mdt:server:getCases')
AddEventHandler('daexv_mdt:server:getCases', function(filters, page, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_cases') then return end
    filters = filters or {}; page = math.max(1, ToInt(page, 1))
    local where = { '1=1' }
    local params = {}
    local search = Trim(filters.search, 80)
    if search ~= '' then
        where[#where+1] = '(title LIKE ? OR summary LIKE ? OR citizen_name LIKE ?)'
        local like = '%' .. search .. '%'; params[#params+1] = like; params[#params+1] = like; params[#params+1] = like
    end
    if Trim(filters.caseType, 50) ~= '' then where[#where+1] = 'case_type = ?'; params[#params+1] = validCaseType(filters.caseType) end
    if Trim(filters.state, 30) ~= '' then where[#where+1] = 'state = ?'; params[#params+1] = validCaseState(filters.state) end
    local clause = table.concat(where, ' AND ')
    local countRows = MySQL.query.await('SELECT COUNT(*) AS total FROM daexv_mdt_cases WHERE ' .. clause, params)
    local total = countRows and countRows[1] and countRows[1].total or 0
    local fetchParams = {}
    for _, v in ipairs(params) do fetchParams[#fetchParams+1] = v end
    fetchParams[#fetchParams+1] = 10; fetchParams[#fetchParams+1] = (page - 1) * 10
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_cases WHERE ' .. clause .. ' ORDER BY updated_at DESC LIMIT ? OFFSET ?', fetchParams)
    SendCallback(src, cbId, { cases = rows or {}, totalCount = total, page = page })
end)

RegisterNetEvent('daexv_mdt:server:getCase')
AddEventHandler('daexv_mdt:server:getCase', function(caseId, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_cases') then return end
    caseId = ToInt(caseId)
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_cases WHERE id = ? LIMIT 1', { caseId })
    local caseFile = rows and rows[1] or nil
    if not caseFile then SendCallback(src, cbId, nil) return end
    caseFile.incidents = MySQL.query.await('SELECT * FROM daexv_mdt_case_incidents WHERE case_id = ? ORDER BY sort_order ASC, id ASC', { caseId }) or {}
    caseFile.charges = MySQL.query.await('SELECT * FROM daexv_mdt_case_charges WHERE case_id = ? ORDER BY id ASC', { caseId }) or {}
    SendCallback(src, cbId, caseFile)
end)

RegisterNetEvent('daexv_mdt:server:createCase')
AddEventHandler('daexv_mdt:server:createCase', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'create_case') then return end
    data = data or {}
    local title = Trim(data.title, 255)
    if title == '' then NotifyPlayer(src, 'El titulo del expediente es obligatorio.', 3000) return end
    local officer = GetCharacterData(src)
    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_cases (title, case_type, state, summary, content, access_level, citizen_id, citizen_name, created_by, created_by_name)
        VALUES (?,?,?,?,?,?,?,?,?,?)]], { title, validCaseType(data.caseType or data.case_type), validCaseState(data.state), Trim(data.summary, 4000), Trim(data.content, 16000), Trim(data.accessLevel or data.access_level, 30), data.citizenId and ToInt(data.citizenId) or nil, Trim(data.citizenName or data.citizen_name, 100), officer.identifier, officer.fullname })
    insertCaseChildren(id, data.incidents, data.charges)
    AuditLog(officer.identifier, officer.fullname, 'created case', 'case', id, title)
    NotifyPlayer(src, 'Expediente registrado.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:updateCase')
AddEventHandler('daexv_mdt:server:updateCase', function(caseId, data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'edit_case') then return end
    caseId = ToInt(caseId); data = data or {}
    local title = Trim(data.title, 255)
    if caseId <= 0 or title == '' then return end
    local officer = GetCharacterData(src)
    MySQL.update.await([[UPDATE daexv_mdt_cases SET title=?, case_type=?, state=?, summary=?, content=?, access_level=?, citizen_id=?, citizen_name=?, updated_by=?, updated_by_name=? WHERE id=?]], {
        title, validCaseType(data.caseType or data.case_type), validCaseState(data.state), Trim(data.summary, 4000), Trim(data.content, 16000), Trim(data.accessLevel or data.access_level, 30), data.citizenId and ToInt(data.citizenId) or nil, Trim(data.citizenName or data.citizen_name, 100), officer.identifier, officer.fullname, caseId
    })
    MySQL.update.await('DELETE FROM daexv_mdt_case_incidents WHERE case_id = ?', { caseId })
    MySQL.update.await('DELETE FROM daexv_mdt_case_charges WHERE case_id = ?', { caseId })
    insertCaseChildren(caseId, data.incidents, data.charges)
    AuditLog(officer.identifier, officer.fullname, 'updated case', 'case', caseId, title)
    NotifyPlayer(src, 'Expediente actualizado.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:updateCaseState')
AddEventHandler('daexv_mdt:server:updateCaseState', function(caseId, state)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'edit_case') then return end
    caseId = ToInt(caseId); state = validCaseState(state)
    MySQL.update.await('UPDATE daexv_mdt_cases SET state = ? WHERE id = ?', { state, caseId })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'updated case state', 'case', caseId, state)
    NotifyPlayer(src, 'Estado del expediente actualizado.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:archiveCase')
AddEventHandler('daexv_mdt:server:archiveCase', function(caseId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'archive_case') then return end
    caseId = ToInt(caseId)
    MySQL.update.await('UPDATE daexv_mdt_cases SET state = "archived" WHERE id = ?', { caseId })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'archived case', 'case', caseId, '')
    NotifyPlayer(src, 'Expediente archivado.', 3000)
end)

