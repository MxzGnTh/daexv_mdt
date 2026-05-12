RegisterNetEvent('daexv_mdt:server:getDashboardStats')
AddEventHandler('daexv_mdt:server:getDashboardStats', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_dashboard') then return end
    local stats = {}
    stats.totalIndividuals = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_individuals WHERE status != "archived"') or 0
    stats.wantedCount      = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_individuals WHERE status = "wanted"') or 0
    stats.activeWarrants   = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_warrants WHERE status IN ("pending","active")') or 0
    stats.openCharges      = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_charges WHERE status = "open"') or 0
    stats.gangCount        = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_gangs WHERE status = "active"') or 0
    stats.weekActivity     = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_audit WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)') or 0
    -- v2: nuevos stats
    stats.activeInmates    = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_inmates WHERE status = "incarcerated"') or 0
    stats.activeLabor      = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_labor WHERE status IN ("assigned","in_progress")') or 0
    stats.finesPending     = MySQL.scalar.await('SELECT COALESCE(SUM(amount),0) FROM daexv_mdt_fines WHERE status IN ("pending","overdue")') or 0
    stats.finesCollected   = MySQL.scalar.await('SELECT COALESCE(SUM(paid_amount),0) FROM daexv_mdt_fines WHERE status = "paid"') or 0
    stats.evidenceCount    = MySQL.scalar.await('SELECT COUNT(*) FROM daexv_mdt_evidence WHERE status NOT IN ("discarded")') or 0
    SendCallback(src, cbId, stats)
end)

RegisterNetEvent('daexv_mdt:server:getRecentActivity')
AddEventHandler('daexv_mdt:server:getRecentActivity', function(cbId)
    local src = source
    if not IsLawEnforcement(src) or not HasPermission(src, 'view_dashboard') then return end
    local rows = MySQL.query.await('SELECT * FROM daexv_mdt_audit ORDER BY created_at DESC LIMIT 20', {})
    SendCallback(src, cbId, rows or {})
end)

