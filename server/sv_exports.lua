local function safeDocId(value)
    return ToInt(value)
end

exports('RegisterLegalDocOnCitizen', function(identifier, docData)
    docData = docData or {}
    identifier = tostring(identifier or '')
    if identifier == '' then return false end

    MySQL.insert.await(
        'INSERT INTO daexv_mdt_legal_refs (identifier, doc_type, doc_code, doc_title, ref_id, section, issued_by) VALUES (?,?,?,?,?,?,?)',
        {
            identifier,
            tostring(docData.type or 'document'),
            tostring(docData.doc_code or ''),
            tostring(docData.title or ''),
            safeDocId(docData.doc_id or docData.ref_id),
            tostring(docData.section or ''),
            tostring(docData.issued_by or ''),
        }
    )

    return true
end)

exports('GetOfficerRank', function(identifier)
    local result = MySQL.query.await('SELECT rank FROM daexv_mdt_officers WHERE identifier = ? LIMIT 1', { tostring(identifier or '') })
    if result and result[1] then return result[1].rank end
    return nil
end)

exports('GetOfficerLevel', function(identifier)
    local rank = exports[GetCurrentResourceName()]:GetOfficerRank(identifier)
    if not rank then return 0 end
    for _, jobData in pairs(Config.Jobs) do
        if jobData.rank == rank then
            return jobData.level
        end
    end
    return 0
end)

exports('SetCitizenStatus', function(identifier, status)
    status = IsAllowedValue(status, DaexvMDTEnums.statuses, 'clear')
    MySQL.update.await('UPDATE daexv_mdt_individuals SET status = ? WHERE identifier = ?', { status, tostring(identifier or '') })
    return true
end)

exports('CancelActiveWarrants', function(identifier, reason)
    MySQL.update.await(
        'UPDATE daexv_mdt_warrants SET status = "cancelled", cancelled_reason = ? WHERE identifier = ? AND status IN ("pending","active")',
        { tostring(reason or 'Cancelled by MDT'), tostring(identifier or '') }
    )
    return true
end)

exports('AttachEvidenceToCase', function(caseId, evidenceData)
    evidenceData = evidenceData or {}
    caseId = ToInt(caseId)
    if caseId == 0 then return false end

    local evType = IsAllowedValue(tostring(evidenceData.evidenceType or evidenceData.type or 'other'), { bullet_casing=true, testimony=true, physical_item=true, photograph=true, fingerprint=true, other=true }, 'other')
    local initChain = json.encode({ { officer = tostring(evidenceData.collectedBy or 'system'), action = 'attached_via_export', timestamp = os.time() } })

    MySQL.insert.await(
        'INSERT INTO daexv_mdt_evidence (case_id, evidence_type, title, description, location_name, collected_by, collected_by_name, chain_of_custody, status) VALUES (?,?,?,?,?,?,?,?,?)',
        {
            caseId,
            evType,
            tostring(evidenceData.title or 'Evidence'),
            tostring(evidenceData.description or ''),
            tostring(evidenceData.locationName or ''),
            tostring(evidenceData.collectedBy or 'system'),
            tostring(evidenceData.collectedByName or 'System'),
            initChain,
            'in_custody',
        }
    )
    return true
end)

exports('GetLegalDocsForCitizen', function(identifier)
    return MySQL.query.await('SELECT * FROM daexv_mdt_legal_refs WHERE identifier = ? ORDER BY issued_at DESC', { tostring(identifier or '') }) or {}
end)

exports('CreateFineFromLegalDoc', function(citizenIdentifier, amount, charge, docRefId, officerIdentifier, officerName)
    citizenIdentifier = tostring(citizenIdentifier or '')
    amount            = ToInt(amount, 0)
    charge            = Trim(tostring(charge or ''), 255)
    officerIdentifier = tostring(officerIdentifier or 'system')
    officerName       = Trim(tostring(officerName or 'System'), 100)

    if citizenIdentifier == '' or amount <= 0 or charge == '' then return false end

    local indivRows = MySQL.query.await(
        "SELECT id, firstname, lastname FROM daexv_mdt_individuals WHERE identifier=? LIMIT 1",
        { citizenIdentifier }
    )
    local indivId   = 0
    local citizenName = citizenIdentifier
    if indivRows and indivRows[1] then
        indivId     = indivRows[1].id
        citizenName = Trim((indivRows[1].firstname or '') .. ' ' .. (indivRows[1].lastname or ''), 100)
    end

    local fineId = MySQL.insert.await(
        "INSERT INTO daexv_mdt_fines (individual_id, citizen_identifier, citizen_name, charge, amount, status, due_date, officer_identifier, officer_name, legal_doc_ref) VALUES (?,?,?,?,?,'pending',DATE_ADD(NOW(), INTERVAL ? DAY),?,?,?)",
        { indivId, citizenIdentifier, citizenName, charge, amount, ToInt(Config.Fines.OverdueDays, 3), officerIdentifier, officerName, ToInt(docRefId, nil) }
    )

    return fineId
end)


