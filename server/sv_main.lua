local VORPcore = {}
TriggerEvent("getCore", function(core) VORPcore = core end)
CreateThread(function()
    Wait(250)
    if (not VORPcore or not VORPcore.getUser) and exports.vorp_core then
        VORPcore = exports.vorp_core:GetCore()
    end
end)

local cooldowns = {}
local validStatuses = { clear=true, wanted=true, dangerous=true, deceased=true, missing=true, archived=true }
local validDanger = { low=true, medium=true, high=true, extreme=true }
local validWarrantStatus = { pending=true, active=true, executed=true, cancelled=true }
local validChargeStatus = { open=true, closed=true, appealed=true }
local validPlea = { guilty=true, not_guilty=true, no_plea=true }
local validGangStatus = { active=true, dismantled=true, unknown=true }
local validGangMemberStatus = { active=true, inactive=true, deceased=true, unknown=true }

local function NormalizeMdtPenalCode(rawPenalCode)
    if type(rawPenalCode) ~= 'table' then
        return Config.PenalCode, 'config', true
    end

    local normalized = {}
    local totalCategories = 0

    for index, category in ipairs(rawPenalCode) do
        if type(category) == 'table' then
            local categoryLabel = Trim(category.label or category.category or category.name or ('Categoria ' .. index), 80)
            local categoryKey = tostring(category.key or category.id or categoryLabel):upper():gsub('%s+', '_'):gsub('[^%w_]', '')
            if categoryKey == '' then
                categoryKey = 'CATEGORY_' .. tostring(index)
            end

            local charges = {}
            for _, article in ipairs(category.articles or category.charges or {}) do
                if type(article) == 'table' and Trim(article.code or '', 20) ~= '' then
                    charges[#charges + 1] = {
                        code = Trim(article.code or '', 20),
                        name = Trim(article.name or article.title or 'Articulo', 120),
                        time = ToInt(article.time or article.sentence, 0),
                        fine = ToInt(article.fine, 0),
                        description = Trim(article.description or '', 255),
                        severity = Trim(article.severity or '', 30),
                    }
                end
            end

            normalized[categoryKey] = {
                label = categoryLabel,
                charges = charges,
            }
            totalCategories = totalCategories + 1
        end
    end

    if totalCategories == 0 then
        return Config.PenalCode, 'config', true
    end

    return normalized, 'legaldocs', false
end

local function ResolvePenalCodePayload()
    if GetResourceState('Daexv_legaldocuments') == 'started' then
        local ok, legalPenalCode = pcall(function()
            return exports['Daexv_legaldocuments']:GetPenalCodeCatalog()
        end)

        if ok and type(legalPenalCode) == 'table' and next(legalPenalCode) ~= nil then
            return NormalizeMdtPenalCode(legalPenalCode)
        end

        print('^3[Daexv_mdt]^7 No se pudo leer el Codigo Penal desde Daexv_legaldocuments. Se usara el fallback local.')
    end

    return Config.PenalCode, 'config', true
end

local function normalizeFineGeoKey(value)
    return string.lower(Trim(value, 80))
end

function ResolveFineJurisdiction(stateName, countyName, townName)
    local states = Config.FineJurisdictions or {}
    local stateKey = normalizeFineGeoKey(stateName)
    local countyKey = normalizeFineGeoKey(countyName)
    local townKey = normalizeFineGeoKey(townName)
    if stateKey == '' or countyKey == '' or townKey == '' then
        return nil, nil, nil
    end

    for _, stateEntry in ipairs(states) do
        if normalizeFineGeoKey(stateEntry.name) == stateKey then
            for _, countyEntry in ipairs(stateEntry.counties or {}) do
                if normalizeFineGeoKey(countyEntry.name) == countyKey then
                    for _, townEntry in ipairs(countyEntry.towns or {}) do
                        if normalizeFineGeoKey(townEntry) == townKey then
                            return stateEntry.name, countyEntry.name, townEntry
                        end
                    end
                end
            end
        end
    end

    return nil, nil, nil
end

function BuildFineJurisdiction(stateName, countyName, townName)
    local parts = {}
    local town = Trim(townName, 80)
    local county = Trim(countyName, 80)
    local state = Trim(stateName, 80)

    if town ~= '' then parts[#parts + 1] = town end
    if county ~= '' then parts[#parts + 1] = county end
    if state ~= '' then parts[#parts + 1] = state end

    return table.concat(parts, ', ')
end

function BuildFineLocationDisplay(stateName, countyName, townName, locationDetail, fallbackLocation)
    local jurisdiction = BuildFineJurisdiction(stateName, countyName, townName)
    local detail = Trim(locationDetail, 200)
    if jurisdiction ~= '' and detail ~= '' then
        return jurisdiction .. ' - ' .. detail
    end
    if jurisdiction ~= '' then
        return jurisdiction
    end
    if detail ~= '' then
        return detail
    end
    return Trim(fallbackLocation, 200)
end

function NotifyPlayer(src, message, duration)
    TriggerClientEvent('vorp:TipRight', src, tostring(message or ''), duration or 4000)
end

function Trim(value, maxLength)
    value = tostring(value or ''):gsub('[\r\n]+', ' '):gsub('%s+', ' '):gsub('^%s+', ''):gsub('%s+$', '')
    if maxLength and #value > maxLength then value = value:sub(1, maxLength) end
    return value
end

function ToInt(value, default)
    local number = tonumber(value)
    if not number then return default or 0 end
    return math.floor(number)
end

function IsAllowedValue(value, allowed, fallback)
    value = tostring(value or '')
    if allowed[value] then return value end
    for _, entry in ipairs(allowed or {}) do
        if tostring(entry) == value then
            return value
        end
    end
    return fallback
end

function GetVorpCharacter(src)
    local user = VORPcore and VORPcore.getUser and VORPcore.getUser(src)
    if not user then return nil end
    local character = user.getUsedCharacter
    if type(character) == 'function' then
        character = character(user)
    end
    return character
end

function GetCharacterData(src)
    local character = GetVorpCharacter(src)
    if not character then return nil end
    local firstname = Trim(character.firstname or 'Unknown', 50)
    local lastname = Trim(character.lastname or 'Officer', 50)
    local fullname = Trim(firstname .. ' ' .. lastname, 100)
    return {
        identifier = tostring(character.charIdentifier or character.identifier or character.charidentifier or ''),
        firstname = firstname,
        lastname = lastname,
        fullname = fullname,
        name = fullname,
        job = tostring(character.job or ''),
        jobLabel = tostring(character.jobLabel or character.job or '')
    }
end

function IsLawEnforcement(src)
    local charData = GetCharacterData(src)
    return charData and Config.Jobs[charData.job] ~= nil or false
end

function GetOfficerLevel(src)
    local charData = GetCharacterData(src)
    if not charData then return 0 end
    local jobData = Config.Jobs[charData.job]
    return jobData and tonumber(jobData.level) or 0
end

function GetOfficerRank(src)
    local charData = GetCharacterData(src)
    if not charData then return nil end
    local jobData = Config.Jobs[charData.job]
    return jobData and jobData.rank or nil
end

function HasPermission(src, permissionKey)
    local required = Config.Permissions[permissionKey] or 999
    return GetOfficerLevel(src) >= required
end

function HasMDTItem(src)
    if not Config.RequireItem then return true end
    if not Config.MDTItem or Config.MDTItem == '' then return true end

    if GetResourceState('vorp_inventory') ~= 'started' then
        return true
    end

    local ok, count = pcall(function()
        return exports.vorp_inventory:getItemCount(src, nil, Config.MDTItem)
    end)
    if ok and tonumber(count or 0) > 0 then return true end

    local okAlt, countAlt = pcall(function()
        return exports.vorp_inventory:getItemCount(src, Config.MDTItem)
    end)
    if okAlt and tonumber(countAlt or 0) > 0 then return true end

    local okItem, item = pcall(function()
        return exports.vorp_inventory:getItem(src, Config.MDTItem)
    end)
    if okItem and item then
        local itemCount = item.count or item.amount or item.quantity or item.qty or 0
        if type(item.getCount) == 'function' then
            local okCount, dynamicCount = pcall(function() return item:getCount() end)
            if okCount and tonumber(dynamicCount or 0) > 0 then return true end
        end
        if tonumber(itemCount or 0) > 0 then return true end
    end

    local okApi, hasApi = pcall(function()
        local api = exports.vorp_inventory:vorp_inventoryApi()
        return api and api.HasItem and api.HasItem(src, Config.MDTItem, 1)
    end)
    if okApi and hasApi then return true end

    return false
end

function AuditLog(officerIdentifier, officerName, action, targetType, targetId, details)
    local ok, err = pcall(function()
        MySQL.insert.await(
            'INSERT INTO daexv_mdt_audit (officer_identifier, officer_name, action, target_type, target_id, details) VALUES (?,?,?,?,?,?)',
            { officerIdentifier or '', officerName or '', action or 'unknown', targetType or '', targetId, details or '' }
        )
    end)
    if not ok then
        print('^3[Daexv_mdt]^7 Audit log skipped: ' .. tostring(err))
    end
end

function UpdateOfficerLogin(identifier, name, rank)
    MySQL.insert.await(
        'INSERT INTO daexv_mdt_officers (identifier, name, rank, last_login) VALUES (?,?,?,NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), rank=VALUES(rank), duty_status="active", last_login=NOW()',
        { identifier, name, rank or 'deputy' }
    )
end

function GetIndividualIdentifier(individualId)
    local rows = MySQL.query.await('SELECT identifier FROM daexv_mdt_individuals WHERE id = ? LIMIT 1', { individualId })
    return rows and rows[1] and rows[1].identifier or nil
end

function FindOnlinePlayerByIdentifier(identifier)
    identifier = tostring(identifier or '')
    if identifier == '' then return nil end
    for _, playerId in ipairs(GetPlayers()) do
        local src = tonumber(playerId)
        local charData = GetCharacterData(src)
        if charData and tostring(charData.identifier) == identifier then
            return src
        end
    end
    return nil
end

function RefreshIndividualWantedStatus(individualId)
    local active = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_warrants WHERE individual_id = ? AND status IN ("pending","active")', { individualId }) or 0
    if tonumber(active) > 0 then
        MySQL.update.await('UPDATE daexv_mdt_individuals SET status = "wanted" WHERE id = ? AND status NOT IN ("deceased","missing","archived")', { individualId })
    else
        MySQL.update.await('UPDATE daexv_mdt_individuals SET status = "clear" WHERE id = ? AND status = "wanted"', { individualId })
    end
end

function SendCallback(src, cbId, payload)
    if cbId then TriggerClientEvent('daexv_mdt:client:cb_' .. tostring(cbId), src, payload or {}) end
end

function OpenMdtForSource(src, openedByItem)
    if not IsLawEnforcement(src) then
        NotifyPlayer(src, 'Acceso denegado. Se requieren credenciales de la ley.', 4000)
        return
    end
    local now = os.time()
    if cooldowns[src] and (now - cooldowns[src]) < (Config.Cooldown or 3) then
        NotifyPlayer(src, 'Con calma. Deja secar la tinta un momento.', 2500)
        return
    end
    if not openedByItem and not HasMDTItem(src) then
        NotifyPlayer(src, 'Necesitas tu portapapeles MDT para abrir el terminal.', 4000)
        return
    end
    cooldowns[src] = now
    local charData = GetCharacterData(src)
    if not charData then return end
    local rank = GetOfficerRank(src) or 'deputy'
    local loginOk, loginErr = pcall(function()
        UpdateOfficerLogin(charData.identifier, charData.fullname, rank)
    end)
    if not loginOk then
        print('^3[Daexv_mdt]^7 Officer login update skipped. Run sql/install.sql if MDT tables are missing: ' .. tostring(loginErr))
    end
    local penalCode, penalCodeSource, penalCodeFallback = ResolvePenalCodePayload()
    TriggerClientEvent('daexv_mdt:open', src, {
        player = { name = charData.fullname, rank = rank, level = GetOfficerLevel(src), identifier = charData.identifier },
        serverName = Config.ServerName,
        departmentSeal = Config.DepartmentSeal,
        penalCode = penalCode,
        penalCodeSource = penalCodeSource,
        penalCodeFallback = penalCodeFallback == true,
        caseTypes = Config.CaseTypes,
        caseStates = Config.CaseStates,
        fineJurisdictions = Config.FineJurisdictions or {},
    })
end

RegisterCommand(Config.OpenCommand, function(source)
    if source == 0 then return end
    OpenMdtForSource(source, false)
end, false)

CreateThread(function()
    Wait(1000)
    if GetResourceState('vorp_inventory') ~= 'started' then
        print('^3[Daexv_mdt]^7 vorp_inventory not started. MDT item checks are bypassed until inventory starts.')
        return
    end

    local itemOk, itemErr = pcall(function()
        MySQL.insert.await(
            'INSERT INTO items (`item`, `label`, `limit`, `can_remove`, `type`, `usable`) VALUES (?, ?, 1, 1, ?, 1) ON DUPLICATE KEY UPDATE `label`=VALUES(`label`), `usable`=1',
            { Config.MDTItem, 'Portapapeles MDT', 'item_standard' }
        )
    end)
    if not itemOk then
        print('^3[Daexv_mdt]^7 Could not auto-register MDT item in database: ' .. tostring(itemErr))
    end

    local ok, err = pcall(function()
        exports.vorp_inventory:registerUsableItem(Config.MDTItem, function(data)
            local itemSource = type(data) == 'table' and (data.source or data.src) or tonumber(data)
            if itemSource then OpenMdtForSource(itemSource, true) end
        end, GetCurrentResourceName())
    end)
    if not ok then print('^1[Daexv_mdt]^7 Could not register usable item: ' .. tostring(err)) end
end)

CreateThread(function()
    while true do
        Wait(60000)
        local now = os.time()
        for src, timestamp in pairs(cooldowns) do
            if now - timestamp > 60 then cooldowns[src] = nil end
        end
    end
end)

_G.DaexvMDTEnums = {
    statuses = validStatuses,
    danger = validDanger,
    warrantStatus = validWarrantStatus,
    chargeStatus = validChargeStatus,
    plea = validPlea,
    gangStatus = validGangStatus,
    gangMemberStatus = validGangMemberStatus,
}



print('^2[Daexv_mdt]^7 Standalone server module loaded.')




