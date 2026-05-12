RegisterNetEvent('daexv_mdt:server:getGangs')
AddEventHandler('daexv_mdt:server:getGangs', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_gangs') then return end
    local rows = MySQL.query.await([[SELECT g.*, COUNT(gm.id) as member_count
        FROM daexv_mdt_gangs g LEFT JOIN daexv_mdt_gang_members gm ON g.id = gm.gang_id
        GROUP BY g.id ORDER BY g.name]], {})
    SendCallback(src, cbId, rows or {})
end)

RegisterNetEvent('daexv_mdt:server:getGang')
AddEventHandler('daexv_mdt:server:getGang', function(gangId, cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_gangs') then return end
    gangId = ToInt(gangId)
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_gangs WHERE id = ? LIMIT 1', { gangId })
    local gang = rows and rows[1] or nil
    if not gang then SendCallback(src, cbId, nil) return end
    gang.members = MySQL.query.await([[SELECT gm.*, i.firstname, i.lastname, i.status AS individual_status, i.image_url
        FROM daexv_mdt_gang_members gm JOIN daexv_mdt_individuals i ON i.id = gm.individual_id
        WHERE gm.gang_id = ? ORDER BY gm.role, i.lastname]], { gangId }) or {}
    SendCallback(src, cbId, gang)
end)

RegisterNetEvent('daexv_mdt:server:createGang')
AddEventHandler('daexv_mdt:server:createGang', function(data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'create_gang') then return end
    data = data or {}
    local name = Trim(data.name, 100)
    if name == '' then NotifyPlayer(src, 'El nombre de la banda es obligatorio.', 3000) return end
    local officer = GetCharacterData(src)
    local id = MySQL.insert.await([[INSERT INTO daexv_mdt_gangs (name, alias, territory, threat_level, status, description, notes, created_by, created_by_name)
        VALUES (?,?,?,?,?,?,?,?,?)]], { name, Trim(data.alias, 100), Trim(data.territory, 200), IsAllowedValue(data.threatLevel or data.threat_level, DaexvMDTEnums.danger, 'low'), IsAllowedValue(data.status, DaexvMDTEnums.gangStatus, 'active'), Trim(data.description, 4000), Trim(data.notes, 4000), officer.identifier, officer.fullname })
    AuditLog(officer.identifier, officer.fullname, 'created gang', 'gang', id, name)
    NotifyPlayer(src, 'Ficha de banda abierta.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:updateGang')
AddEventHandler('daexv_mdt:server:updateGang', function(gangId, data)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'edit_gang') then return end
    data = data or {}
    gangId = ToInt(gangId)
    local name = Trim(data.name, 100)
    if gangId <= 0 or name == '' then return end
    MySQL.update.await('UPDATE daexv_mdt_gangs SET name=?, alias=?, territory=?, threat_level=?, status=?, description=?, notes=? WHERE id=?', {
        name, Trim(data.alias, 100), Trim(data.territory, 200), IsAllowedValue(data.threatLevel or data.threat_level, DaexvMDTEnums.danger, 'low'), IsAllowedValue(data.status, DaexvMDTEnums.gangStatus, 'active'), Trim(data.description, 4000), Trim(data.notes, 4000), gangId
    })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'updated gang', 'gang', gangId, name)
    NotifyPlayer(src, 'Ficha de banda actualizada.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:addGangMember')
AddEventHandler('daexv_mdt:server:addGangMember', function(gangId, individualId, role)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'add_gang_member') then return end
    gangId = ToInt(gangId); individualId = ToInt(individualId)
    if gangId <= 0 or individualId <= 0 then return end
    MySQL.insert.await('INSERT IGNORE INTO daexv_mdt_gang_members (gang_id, individual_id, role) VALUES (?,?,?)', { gangId, individualId, Trim(role, 80) ~= '' and Trim(role, 80) or 'Member' })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'added gang member', 'gang', gangId, tostring(individualId))
    NotifyPlayer(src, 'Miembro agregado a la ficha de banda.', 3000)
end)

RegisterNetEvent('daexv_mdt:server:removeGangMember')
AddEventHandler('daexv_mdt:server:removeGangMember', function(memberId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'remove_gang_member') then return end
    memberId = ToInt(memberId)
    MySQL.update.await('DELETE FROM daexv_mdt_gang_members WHERE id = ?', { memberId })
    local officer = GetCharacterData(src)
    AuditLog(officer.identifier, officer.fullname, 'removed gang member', 'gang_member', memberId, '')
    NotifyPlayer(src, 'Miembro retirado de la ficha de banda.', 3000)
end)

