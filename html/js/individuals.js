/* ================================
   GESTIÓN DE INDIVIDUOS/CIUDADANOS
   ================================ */

// Setup
document.addEventListener('DOMContentLoaded', function() {
  setupIndividualsUI();
});

function setupIndividualsUI() {
  // Search
  const searchInput = document.getElementById('citizenSearch');
  if (searchInput) {
    searchInput.addEventListener('input', MDT.debounce(searchIndividuals, MDT.state.debounceTimer || 400));
  }

  // Add citizen button
  const addBtn = document.getElementById('addCitizenBtn');
  if (addBtn) {
    addBtn.addEventListener('click', openCreateIndividualModal);
  }

  // Create form
  const createForm = document.getElementById('createIndividualForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateIndividual);
  }
}

// ================================
// SEARCH INDIVIDUOS
// ================================

function searchIndividuals(e) {
  const query = e.target.value.trim();

  if (!query) {
    document.getElementById('citizensList').innerHTML = '<p class="no-results">Search for a citizen...</p>';
    return;
  }

  MDT.nui('searchIndividuals', { query }).then(results => {
    if (results.error) {
      MDT.showNotification(results.error, 'error');
      return;
    }

    displaySearchResults(results);
  });
}

function displaySearchResults(citizens) {
  const container = document.getElementById('citizensList');

  if (!citizens || citizens.length === 0) {
    container.innerHTML = '<p class="no-results">No citizens found</p>';
    return;
  }

  container.innerHTML = citizens.map(citizen => `
    <div class="citizen-card" onclick="openIndividualFile(${citizen.id})">
      <div class="citizen-photo">👤</div>
      <div>
        <p class="citizen-name">${citizen.firstname} ${citizen.lastname}</p>
        <p class="citizen-desc">${citizen.description ? citizen.description.substring(0, 30) + '...' : 'No description'}</p>
      </div>
      <span class="status-badge status-${citizen.status}">${MDT.getStatusBadge(citizen.status)}</span>
    </div>
  `).join('');
}

// ================================
// OPEN INDIVIDUAL FILE
// ================================

function openIndividualFile(individualId) {
  MDT.nui('getIndividual', { id: individualId }).then(individual => {
    if (individual.error) {
      MDT.showNotification(individual.error, 'error');
      return;
    }

    displayIndividualFile(individual);
    document.getElementById('individualModal').classList.remove('hidden');
  });
}

function displayIndividualFile(individual) {
  const container = document.getElementById('individualFileContent');

  // Charges
  const chargesHTML = individual.charges && individual.charges.length > 0
    ? individual.charges.map((charge, idx) => `
      <tr>
        <td>${charge.charge}</td>
        <td>${charge.penal_code}</td>
        <td>${charge.plea}</td>
        <td>${charge.sentence || '-'}</td>
        <td>$${charge.fine}</td>
        <td class="status-${charge.status}">${charge.status}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="no-results">No charges</td></tr>';

  // Warrants
  const warrantsHTML = individual.warrants && individual.warrants.length > 0
    ? individual.warrants.map(w => `
      <div style="padding: 8px; background: #ffe4e1; border-left: 4px solid red; margin: 4px 0;">
        <strong>${w.title}</strong> (${w.status})
        <br><small>Danger: ${w.danger_level} | Bounty: $${w.bounty}</small>
      </div>
    `).join('')
    : '<p class="no-results">No warrants</p>';

  // Gang memberships
  const gangsHTML = individual.gangMemberships && individual.gangMemberships.length > 0
    ? individual.gangMemberships.map(gm => `
      <div style="padding: 8px; background: #f0f0f0; border-left: 4px solid #666; margin: 4px 0;">
        <strong>${gm.gang_name}</strong> - ${gm.role} (${gm.status})
      </div>
    `).join('')
    : '<p class="no-results">No gang affiliations</p>';

  const html = `
    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 16px;">
      <div>
        <div class="citizen-photo" style="height: 200px; font-size: 60px;">👤</div>
        <div style="margin-top: 12px;">
          <p><strong>Status:</strong> <span class="status-badge status-${individual.status}">${MDT.getStatusBadge(individual.status)}</span></p>
          <p><strong>ID:</strong> ${individual.id}</p>
        </div>
      </div>

      <div>
        <h3>${individual.firstname} ${individual.lastname}</h3>

        <div style="margin-bottom: 12px;">
          <strong>Identifier:</strong> ${individual.identifier}<br>
          <strong>DOB:</strong> ${individual.dob || 'Unknown'}<br>
          <strong>Telegram:</strong> ${individual.telegram || 'None'}<br>
        </div>

        ${individual.aliases ? `<p><strong>Aliases:</strong> ${individual.aliases}</p>` : ''}
        ${individual.affiliations ? `<p><strong>Affiliations:</strong> ${individual.affiliations}</p>` : ''}
        ${individual.description ? `<p><strong>Description:</strong> ${individual.description}</p>` : ''}
        ${individual.known_associates ? `<p><strong>Known Associates:</strong> ${individual.known_associates}</p>` : ''}
        ${individual.notes ? `<p><strong>Notes:</strong> ${individual.notes}</p>` : ''}

        <div style="margin-top: 12px;">
          <button class="btn btn-primary" onclick="openEditIndividualModal(${individual.id})">Edit File</button>
          <button class="btn" onclick="openAddChargeModal(${individual.id})">Add Charge</button>
          <button class="btn" onclick="openCreateWarrantModal(${individual.id})">Create Warrant</button>
        </div>
      </div>
    </div>

    <hr style="margin: 16px 0; border: 1px dashed #999;">

    <h4>Gang Affiliations</h4>
    <div style="margin-bottom: 12px;">
      ${gangsHTML}
    </div>

    <h4>Active Warrants</h4>
    <div style="margin-bottom: 12px;">
      ${warrantsHTML}
    </div>

    <h4>Criminal Record</h4>
    <table class="reports-table" style="font-size: 10px;">
      <thead>
        <tr>
          <th>Charge</th>
          <th>Code</th>
          <th>Plea</th>
          <th>Sentence</th>
          <th>Fine</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${chargesHTML}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// ================================
// CREATE INDIVIDUAL
// ================================

function openCreateIndividualModal() {
  document.getElementById('createIndividualModal').classList.remove('hidden');
}

function handleCreateIndividual(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    firstname: formData.get('firstname'),
    lastname: formData.get('lastname'),
    identifier: formData.get('identifier'),
    dob: formData.get('dob'),
    description: formData.get('description'),
    aliases: formData.get('aliases'),
    affiliations: formData.get('affiliations'),
    telegram: formData.get('telegram')
  };

  MDT.nui('createIndividual', data).then(() => {
    MDT.showNotification('Citizen file created successfully', 'success');
    document.getElementById('createIndividualModal').classList.add('hidden');
    e.target.reset();
  });
}

// ================================
// EDIT INDIVIDUAL
// ================================

function openEditIndividualModal(individualId) {
  MDT.nui('getIndividual', { id: individualId }).then(individual => {
    if (individual.error) {
      MDT.showNotification(individual.error, 'error');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        <h2>Edit Citizen File</h2>
        <form class="form" onsubmit="handleUpdateIndividual(event, ${individual.id})">
          <div class="form-row">
            <div class="form-group">
              <label>First Name</label>
              <input type="text" name="firstname" value="${individual.firstname}" required>
            </div>
            <div class="form-group">
              <label>Last Name</label>
              <input type="text" name="lastname" value="${individual.lastname}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>DOB</label>
              <input type="text" name="dob" value="${individual.dob || ''}">
            </div>
            <div class="form-group">
              <label>Telegram</label>
              <input type="text" name="telegram" value="${individual.telegram || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea name="description" maxlength="500">${individual.description || ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Aliases</label>
              <input type="text" name="aliases" value="${individual.aliases || ''}">
            </div>
            <div class="form-group">
              <label>Affiliations</label>
              <input type="text" name="affiliations" value="${individual.affiliations || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="clear" ${individual.status === 'clear' ? 'selected' : ''}>Clear</option>
              <option value="wanted" ${individual.status === 'wanted' ? 'selected' : ''}>Wanted</option>
              <option value="dangerous" ${individual.status === 'dangerous' ? 'selected' : ''}>Dangerous</option>
              <option value="deceased" ${individual.status === 'deceased' ? 'selected' : ''}>Deceased</option>
              <option value="missing" ${individual.status === 'missing' ? 'selected' : ''}>Missing</option>
            </select>
          </div>
          <div class="form-group">
            <label>Known Associates</label>
            <textarea name="known_associates">${individual.known_associates || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea name="notes">${individual.notes || ''}</textarea>
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

function handleUpdateIndividual(e, individualId) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    firstname: formData.get('firstname'),
    lastname: formData.get('lastname'),
    dob: formData.get('dob'),
    description: formData.get('description'),
    aliases: formData.get('aliases'),
    affiliations: formData.get('affiliations'),
    telegram: formData.get('telegram'),
    known_associates: formData.get('known_associates'),
    notes: formData.get('notes')
  };

  MDT.nui('updateIndividual', { id: individualId, data }).then(() => {
    MDT.showNotification('Citizen file updated', 'success');
    e.target.closest('.modal').remove();
  });
}

// ================================
// CHANGE INDIVIDUAL STATUS
// ================================

function setIndividualStatus(individualId, status) {
  MDT.nui('setIndividualStatus', { id: individualId, status }).then(() => {
    MDT.showNotification('Status updated: ' + status, 'success');
  });
}

console.log('[Daexv_mdt] Individuals module loaded');
