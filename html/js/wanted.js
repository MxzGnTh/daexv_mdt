/* ================================
   GESTIÓN DE WANTED / WARRANTS
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  setupWantedUI();
});

function setupWantedUI() {
  const createBtn = document.getElementById('createWarrantBtn');
  if (createBtn) {
    createBtn.addEventListener('click', openCreateWarrantModal);
  }
}

// ================================
// CARGAR LISTA DE BUSCADOS
// ================================

function loadWantedList() {
  MDT.nui('getWantedList', {}).then(warrants => {
    if (warrants.error) {
      MDT.showNotification(warrants.error, 'error');
      return;
    }

    displayWantedList(warrants);
    updateWantedBadge(warrants);
  });
}

function displayWantedList(warrants) {
  const container = document.getElementById('wantedGrid');

  if (!warrants || warrants.length === 0) {
    container.innerHTML = '<p class="no-results">No wanted individuals</p>';
    return;
  }

  container.innerHTML = warrants.map(warrant => `
    <div class="wanted-poster" style="transform: rotate(${Math.random() * 4 - 2}deg);">
      <div class="wanted-photo" style="font-size: 50px;">👤</div>
      <p class="wanted-name">${warrant.firstname} ${warrant.lastname}</p>
      <div class="wanted-charges">${warrant.charges}</div>
      <span class="danger-badge danger-${warrant.danger_level}">${warrant.danger_level.toUpperCase()}</span>
      <p class="wanted-bounty">Bounty: $${warrant.bounty || 0}</p>
      <div style="margin-top: 8px; display: flex; gap: 6px; justify-content: center;">
        ${warrant.status === 'active' ? `
          <button class="btn" onclick="executeWarrant(${warrant.id})">Execute</button>
        ` : warrant.status === 'pending' ? `
          <button class="btn" onclick="signWarrant(${warrant.id})" ${MDT.state.officer.level < 4 ? 'disabled' : ''}>Sign (Judge)</button>
        ` : ''}
        <button class="btn" onclick="cancelWarrantModal(${warrant.id})">Cancel</button>
      </div>
    </div>
  `).join('');
}

function updateWantedBadge(warrants) {
  const activeCount = warrants.filter(w => w.status === 'active' || w.status === 'pending').length;
  document.getElementById('wantedBadge').textContent = activeCount;
}

// ================================
// CREAR WARRANT
// ================================

function openCreateWarrantModal(individualId) {
  const modal = document.getElementById('createWarrantModal');

  // Si es desde el botón en el panel, mostrar búsqueda de individuo
  if (!individualId) {
    modal.classList.remove('hidden');
    return;
  }

  // Si viene con ID, pre-llenar
  const form = document.getElementById('createWarrantForm');
  form.querySelector('input[name="individual_id"]').value = individualId;

  // Obtener nombre del individuo
  MDT.nui('getIndividual', { id: individualId }).then(individual => {
    if (individual && !individual.error) {
      document.getElementById('warrantIndividual').value = `${individual.firstname} ${individual.lastname}`;
    }
  });

  modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
  const createForm = document.getElementById('createWarrantForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateWarrant);
  }
});

function handleCreateWarrant(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    individual_id: parseInt(formData.get('individual_id')) || 0,
    title: formData.get('title'),
    charges: formData.get('charges'),
    reason: formData.get('reason'),
    danger_level: formData.get('danger_level'),
    bounty: parseInt(formData.get('bounty')) || 0
  };

  if (!data.individual_id) {
    MDT.showNotification('Please select a citizen', 'error');
    return;
  }

  MDT.nui('createWarrant', data).then(() => {
    MDT.showNotification('Warrant created and sent for approval', 'success');
    document.getElementById('createWarrantModal').classList.add('hidden');
    e.target.reset();
    loadWantedList();
  });
}

// ================================
// FIRMAR WARRANT (JUEZ)
// ================================

function signWarrant(warrantId) {
  if (MDT.state.officer.level < 4) {
    MDT.showNotification('Only judges can sign warrants', 'error');
    return;
  }

  if (!confirm('Sign and activate this warrant?')) return;

  MDT.nui('signWarrant', { warrant_id: warrantId }).then(() => {
    MDT.showNotification('Warrant signed and activated', 'success');
    loadWantedList();
  });
}

// ================================
// EJECUTAR WARRANT
// ================================

function executeWarrant(warrantId) {
  if (!confirm('Mark this warrant as executed?')) return;

  MDT.nui('executeWarrant', { warrant_id: warrantId }).then(() => {
    MDT.showNotification('Warrant marked as executed', 'success');
    loadWantedList();
  });
}

// ================================
// CANCELAR WARRANT
// ================================

function cancelWarrantModal(warrantId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h2>Cancel Warrant</h2>
      <form class="form" onsubmit="handleCancelWarrant(event, ${warrantId})">
        <div class="form-group">
          <label>Reason for Cancellation *</label>
          <textarea name="reason" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Cancel Warrant</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function handleCancelWarrant(e, warrantId) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const reason = formData.get('reason');

  MDT.nui('cancelWarrant', { warrant_id: warrantId, reason }).then(() => {
    MDT.showNotification('Warrant cancelled', 'success');
    e.target.closest('.modal').remove();
    loadWantedList();
  });
}

console.log('[Daexv_mdt] Wanted module loaded');
