/* ================================
   GESTIÓN DE CARGOS CRIMINALES
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  setupCriminalUI();
});

function setupCriminalUI() {
  // Los botones de cargos se agregan dinámicamente
}

// ================================
// AGREGAR CARGO
// ================================

function openAddChargeModal(individualId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <h2>Add Criminal Charge</h2>
      <form class="form" onsubmit="handleAddCharge(event, ${individualId})">
        <div class="form-group">
          <label>Charge Description *</label>
          <input type="text" name="charge" placeholder="e.g., Armed Robbery" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Penal Code</label>
            <input type="text" name="penal_code" placeholder="e.g., CP-201" list="penalCodes">
            <datalist id="penalCodes">
              <option value="CP-101">CP-101 - Homicidio</option>
              <option value="CP-102">CP-102 - Intento de Homicidio</option>
              <option value="CP-103">CP-103 - Agresión Grave</option>
              <option value="CP-104">CP-104 - Agresión Simple</option>
              <option value="CP-105">CP-105 - Lesiones</option>
              <option value="CP-201">CP-201 - Robo Cualificado</option>
              <option value="CP-202">CP-202 - Robo Simple</option>
              <option value="CP-203">CP-203 - Hurto</option>
              <option value="CP-301">CP-301 - Alteración del Orden Público</option>
              <option value="CP-401">CP-401 - Porte Ilegal de Arma</option>
              <option value="CP-501">CP-501 - Membresía en Banda Criminal</option>
            </datalist>
          </div>
          <div class="form-group">
            <label>Plea</label>
            <select name="plea">
              <option value="Sin Declaración">Sin Declaración</option>
              <option value="Culpable">Culpable</option>
              <option value="No Culpable">No Culpable</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea name="description" maxlength="500"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Sentence</label>
            <input type="text" name="sentence" placeholder="e.g., 5 years">
          </div>
          <div class="form-group">
            <label>Fine ($)</label>
            <input type="number" name="fine" value="0" min="0">
          </div>
        </div>

        <button type="submit" class="btn btn-primary">Add Charge</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function handleAddCharge(e, individualId) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    individual_id: individualId,
    charge: formData.get('charge'),
    penal_code: formData.get('penal_code'),
    description: formData.get('description'),
    sentence: formData.get('sentence'),
    fine: parseInt(formData.get('fine')) || 0,
    plea: formData.get('plea')
  };

  MDT.nui('addCharge', data).then(() => {
    MDT.showNotification('Charge added successfully', 'success');
    e.target.closest('.modal').remove();
  });
}

// ================================
// OBTENER CARGOS
// ================================

function getChargesForIndividual(individualId, callback) {
  MDT.nui('getCharges', { individual_id: individualId }).then(charges => {
    if (charges.error) {
      MDT.showNotification(charges.error, 'error');
      return;
    }
    callback(charges);
  });
}

// ================================
// ACTUALIZAR CARGO
// ================================

function updateChargeStatus(chargeId, newStatus) {
  MDT.nui('updateChargeStatus', { charge_id: chargeId, status: newStatus }).then(() => {
    MDT.showNotification('Charge status updated: ' + newStatus, 'success');
  });
}

// ================================
// ELIMINAR CARGO
// ================================

function deleteCharge(chargeId) {
  if (!confirm('Are you sure you want to delete this charge?')) return;

  MDT.nui('deleteCharge', { charge_id: chargeId }).then(() => {
    MDT.showNotification('Charge deleted', 'success');
  });
}

console.log('[Daexv_mdt] Criminal module loaded');
