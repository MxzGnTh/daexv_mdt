/* ================================
   DASHBOARD Y ESTADÍSTICAS
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Dashboard está listo
});

// ================================
// CARGAR ESTADÍSTICAS DEL DASHBOARD
// ================================

function loadDashboardStats() {
  MDT.nui('getDashboardStats', {}).then(stats => {
    if (stats.error) {
      MDT.showNotification(stats.error, 'error');
      return;
    }

    displayDashboardStats(stats);
    loadRecentActivity();
  });
}

function displayDashboardStats(stats) {
  document.getElementById('totalIndividuals').textContent = stats.totalIndividuals || 0;
  document.getElementById('wantedActive').textContent = stats.wantedCount || 0;
  document.getElementById('activeWarrants').textContent = stats.activeWarrants || 0;
  document.getElementById('openCharges').textContent = stats.openCharges || 0;
  document.getElementById('activeGangs').textContent = stats.gangCount || 0;
  document.getElementById('last7days').textContent = stats.last7days || 0;
}

// ================================
// CARGAR ACTIVIDAD RECIENTE
// ================================

function loadRecentActivity() {
  MDT.nui('getRecentActivity', {}).then(activity => {
    if (activity.error) {
      console.error('Error loading activity:', activity.error);
      return;
    }

    displayRecentActivity(activity);
  });
}

function displayRecentActivity(activities) {
  const container = document.getElementById('activityList');

  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="no-results">No recent activity</p>';
    return;
  }

  container.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div style="font-weight: bold; color: var(--color-wood-dark);">
        ${activity.officer_name}
      </div>
      <div>
        ${getActivityDescription(activity)}
      </div>
      <div class="activity-time">${MDT.formatDate(activity.created_at)}</div>
    </div>
  `).join('');
}

function getActivityDescription(activity) {
  const actions = {
    'CREATE_INDIVIDUAL': 'created a new citizen file',
    'UPDATE_INDIVIDUAL': 'updated a citizen file',
    'SET_INDIVIDUAL_STATUS': 'changed individual status',
    'ARCHIVE_INDIVIDUAL': 'archived a citizen file',
    'CREATE_WARRANT': 'created a warrant',
    'SIGN_WARRANT': 'signed a warrant',
    'EXECUTE_WARRANT': 'executed a warrant',
    'CANCEL_WARRANT': 'cancelled a warrant',
    'ADD_CHARGE': 'added a criminal charge',
    'UPDATE_CHARGE_STATUS': 'updated charge status',
    'DELETE_CHARGE': 'deleted a charge',
    'CREATE_GANG': 'created a new gang',
    'UPDATE_GANG': 'updated gang information',
    'ADD_GANG_MEMBER': 'added gang member',
    'REMOVE_GANG_MEMBER': 'removed gang member'
  };

  return `<strong>${actions[activity.action] || activity.action}</strong> on ${activity.target_type}`;
}

// ================================
// ESTADÍSTICAS AVANZADAS
// ================================

function loadAdvancedStats() {
  MDT.nui('getAdvancedStats', {}).then(stats => {
    if (stats.error) {
      console.error('Error loading advanced stats:', stats.error);
      return;
    }

    displayAdvancedStats(stats);
  });
}

function displayAdvancedStats(stats) {
  // Esta función puede ser ampliada para mostrar gráficos más complejos
  console.log('Advanced Stats:', stats);
}

console.log('[Daexv_mdt] Dashboard module loaded');
