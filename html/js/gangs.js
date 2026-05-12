/* ================================
   GESTIÓN DE BANDAS
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  setupGangsUI();
});

function setupGangsUI() {
  const createBtn = document.getElementById('createGangBtn');
  if (createBtn) {
    createBtn.addEventListener('click', openCreateGangModal);
  }
}

// ================================
// CARGAR LISTA DE BANDAS
// ================================

function loadGangs() {
  MDT.nui('getGangs', {}).then(gangs => {
    if (gangs.error) {
      MDT.showNotification(gangs.error, 'error');
      return;
    }

    displayGangsList(gangs);
  });
}

function displayGangsList(gangs) {
  const container = document.getElementById('gangsList');

  if (!gangs || gangs.length === 0) {
    container.innerHTML = '<p class="no-results">No gangs registered</p>';
    return;
  }

  container.innerHTML = gangs.map(gang => `
    <div class="citizen-card" onclick="openGangFile(${gang.id})" style="cursor: pointer;">
      <h3 style="margin: 0 0 4px; font-size: 14px;">${gang.name}</h3>
      <p style="margin: 0 0 4px; font-size: 11px; color: #666;">
        <strong>Alias:</strong> ${gang.alias || 'None'}<br>
        <strong>Territory:</strong> ${gang.territory || 'Unknown'}<br>
        <strong>Members:</strong> ${gang.member_count || 0}
      </p>
      <span class="status-badge status-${gang.threat_level}" style="display: inline-block; margin-top: 4px;">
        ${gang.threat_level.toUpperCase()}
      </span>
    </div>
  `).join('');
}

// ================================
// ABRIR FICHA DE BANDA
// ================================

function openGangFile(gangId) {
  MDT.nui('getGang', { id: gangId }).then(gang => {
    if (gang.error) {
      MDT.showNotification(gang.error, 'error');
      return;
    }

    displayGangFile(gang);
  });
}

function displayGangFile(gang) {
  const modal = document.createElement('div');
  modal.className = 'modal';

  const membersHTML = gang.members && gang.members.length > 0
    ? gang.members.map(member => `
      <tr>
        <td onclick="openIndividualFile(${member.individual_id})" style="cursor: pointer; color: #8b0000;">
          ${member.firstname} ${member.lastname}
        </td>
        <td>${member.role}</td>
        <td>${member.status}</td>
        <td>${MDT.getStatusBadge(member.individual_status)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="no-results">No members</td></tr>';

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h2>${gang.name}</h2>

      <div style="margin-bottom: 12px;">
        <p><strong>Alias:</strong> ${gang.alias || 'None'}</p>
        <p><strong>Territory:</strong> ${gang.territory || 'Unknown'}</p>
        <p><strong>Status:</strong> <span class="status-badge status-${gang.status}">${gang.status}</span></p>
        <p><strong>Threat Level:</strong> <span class="status-badge status-${gang.threat_level}">${gang.threat_level}</span></p>
        ${gang.description ? `<p><strong>Description:</strong> ${gang.description}</p>` : ''}
        ${gang.notes ? `<p><strong>Notes:</strong> ${gang.notes}</p>` : ''}
      </div>

      <div style="margin-bottom: 12px;">
        <button class="btn" onclick="openEditGangModal(${gang.id})">Edit Gang</button>
        <button class="btn btn-primary" onclick="openAddMemberModal(${gang.id})">Add Member</button>
      </div>

      <h4>Members (${gang.members ? gang.members.length : 0})</h4>
      <table class="reports-table" style="font-size: 10px;">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Individual Status</th>
          </tr>
        </thead>
        <tbody>
          ${membersHTML}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ================================
// CREAR BANDA
// ================================

function openCreateGangModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h2>Create New Gang</h2>
      <form class="form" onsubmit="handleCreateGang(event)">
        <div class="form-group">
          <label>Gang Name *</label>
          <input type="text" name="name" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Alias</label>
            <input type="text" name="alias">
          </div>
          <div class="form-group">
            <label>Territory</label>
            <input type="text" name="territory">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Threat Level</label>
            <select name="threat_level">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="active">Active</option>
              <option value="dismantled">Dismantled</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea name="description"></textarea>
        </div>

        <div class="form-group">
          <label>Notes</label>
          <textarea name="notes"></textarea>
        </div>

        <button type="submit" class="btn btn-primary">Create Gang</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function handleCreateGang(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    alias: formData.get('alias'),
    territory: formData.get('territory'),
    threat_level: formData.get('threat_level'),
    status: formData.get('status'),
    description: formData.get('description'),
    notes: formData.get('notes')
  };

  MDT.nui('createGang', data).then(() => {
    MDT.showNotification('Gang created', 'success');
    e.target.closest('.modal').remove();
    loadGangs();
  });
}

// ================================
// EDITAR BANDA
// ================================

function openEditGangModal(gangId) {
  MDT.nui('getGang', { id: gangId }).then(gang => {
    if (gang.error) {
      MDT.showNotification(gang.error, 'error');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        <h2>Edit Gang</h2>
        <form class="form" onsubmit="handleEditGang(event, ${gang.id})">
          <div class="form-group">
            <label>Gang Name</label>
            <input type="text" name="name" value="${gang.name}" required>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Alias</label>
              <input type="text" name="alias" value="${gang.alias || ''}">
            </div>
            <div class="form-group">
              <label>Territory</label>
              <input type="text" name="territory" value="${gang.territory || ''}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Threat Level</label>
              <select name="threat_level">
                <option value="low" ${gang.threat_level === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${gang.threat_level === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${gang.threat_level === 'high' ? 'selected' : ''}>High</option>
                <option value="extreme" ${gang.threat_level === 'extreme' ? 'selected' : ''}>Extreme</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select name="status">
                <option value="active" ${gang.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="dismantled" ${gang.status === 'dismantled' ? 'selected' : ''}>Dismantled</option>
                <option value="unknown" ${gang.status === 'unknown' ? 'selected' : ''}>Unknown</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea name="description">${gang.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea name="notes">${gang.notes || ''}</textarea>
          </div>

          <button type="submit" class="btn btn-primary">Save Changes</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  });
}

function handleEditGang(e, gangId) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    alias: formData.get('alias'),
    territory: formData.get('territory'),
    threat_level: formData.get('threat_level'),
    status: formData.get('status'),
    description: formData.get('description'),
    notes: formData.get('notes')
  };

  MDT.nui('updateGang', { id: gangId, data }).then(() => {
    MDT.showNotification('Gang updated', 'success');
    e.target.closest('.modal').remove();
    loadGangs();
  });
}

// ================================
// AGREGAR MIEMBRO
// ================================

function openAddMemberModal(gangId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h2>Add Gang Member</h2>
      <form class="form" onsubmit="handleAddMember(event, ${gangId})">
        <div class="form-group">
          <label>Search Citizen *</label>
          <input type="text" id="memberSearch" placeholder="Search by name..." required>
          <input type="hidden" name="individual_id" id="selectedMemberId" required>
          <div id="memberSearchResults" style="margin-top: 8px; max-height: 150px; overflow-y: auto;"></div>
        </div>

        <div class="form-group">
          <label>Role in Gang</label>
          <input type="text" name="role" value="Miembro">
        </div>

        <button type="submit" class="btn btn-primary">Add Member</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const searchInput = modal.querySelector('#memberSearch');
  searchInput.addEventListener('input', MDT.debounce((e) => {
    if (e.target.value.length < 2) {
      modal.querySelector('#memberSearchResults').innerHTML = '';
      return;
    }

    MDT.nui('searchIndividuals', { query: e.target.value }).then(results => {
      const resultsContainer = modal.querySelector('#memberSearchResults');
      resultsContainer.innerHTML = (results || []).map(ind => `
        <div style="padding: 6px; background: #f0f0f0; cursor: pointer; border-radius: 2px; margin-bottom: 4px;"
             onclick="selectMember(${ind.id}, '${ind.firstname} ${ind.lastname}')">
          ${ind.firstname} ${ind.lastname}
        </div>
      `).join('');
    });
  }, 400));

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function selectMember(individualId, name) {
  const modal = document.querySelector('.modal:not(.hidden)');
  if (modal) {
    modal.querySelector('#selectedMemberId').value = individualId;
    modal.querySelector('#memberSearch').value = name;
    modal.querySelector('#memberSearchResults').innerHTML = '';
  }
}

function handleAddMember(e, gangId) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const individualId = parseInt(formData.get('individual_id'));

  if (!individualId) {
    MDT.showNotification('Please select a citizen', 'error');
    return;
  }

  MDT.nui('addGangMember', {
    gang_id: gangId,
    individual_id: individualId,
    role: formData.get('role')
  }).then(() => {
    MDT.showNotification('Member added', 'success');
    e.target.closest('.modal').remove();
    loadGangs();
  });
}

console.log('[Daexv_mdt] Gangs module loaded');
