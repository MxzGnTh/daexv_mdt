/* ================================
   SISTEMA DE TELEGRAMAS
   ================================ */

document.addEventListener('DOMContentLoaded', function() {
  setupTelegramUI();
});

function setupTelegramUI() {
  const form = document.getElementById('telegramForm');
  if (form) {
    form.addEventListener('submit', handleSendTelegram);
  }

  // Officer search
  const toOfficerInput = document.getElementById('toOfficer');
  if (toOfficerInput) {
    toOfficerInput.addEventListener('input', searchOfficers);
  }
}

// ================================
// BUSCAR OFICIALES
// ================================

function searchOfficers(e) {
  const query = e.target.value.trim();
  const resultsList = document.getElementById('officersList');

  if (!query || query.length < 2) {
    resultsList.innerHTML = '';
    return;
  }

  // Por ahora mostrar un placeholder
  // En una implementación completa, se buscaría en la BD
  resultsList.innerHTML = `
    <div style="padding: 6px; background: #f0f0f0; cursor: pointer; border-radius: 2px;">
      Officer Name (Placeholder)
    </div>
  `;
}

// ================================
// ENVIAR TELEGRAMA
// ================================

function handleSendTelegram(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    to_identifier: formData.get('toOfficer'), // Por ahora usar el nombre
    subject: formData.get('subject'),
    body: formData.get('body'),
    urgent: document.getElementById('urgentCheck').checked ? 1 : 0
  };

  if (!data.to_identifier || !data.subject || !data.body) {
    MDT.showNotification('Please fill all required fields', 'error');
    return;
  }

  MDT.nui('sendTelegram', data).then(() => {
    MDT.showNotification('Telegram sent successfully', 'success');
    e.target.reset();
    document.getElementById('officersList').innerHTML = '';
    loadOutbox();
  });
}

// ================================
// CARGAR BANDEJA DE ENTRADA
// ================================

function loadInbox() {
  MDT.nui('getInbox', {}).then(messages => {
    if (messages.error) {
      console.error('Error loading inbox:', messages.error);
      return;
    }

    displayInbox(messages);
  });
}

function displayInbox(messages) {
  const container = document.getElementById('inboxList');

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p class="no-results">No messages</p>';
    return;
  }

  container.innerHTML = messages.map(msg => `
    <div class="telegram-message ${msg.read_at ? '' : 'unread'} ${msg.urgent ? 'urgent' : ''}">
      <div class="message-header">
        <span class="message-from">${msg.from_name || 'Unknown'}</span>
        <span class="message-time">${MDT.formatDate(msg.created_at)}</span>
      </div>
      <div class="message-subject">${msg.subject}</div>
      <div class="message-body">${msg.body}</div>
      <div style="margin-top: 6px; display: flex; gap: 6px;">
        ${!msg.read_at ? `<button class="btn" style="padding: 4px 8px; font-size: 10px;" onclick="markTelegramRead(${msg.id})">Mark Read</button>` : ''}
        <button class="btn" style="padding: 4px 8px; font-size: 10px;" onclick="deleteTelegramMsg(${msg.id})">Delete</button>
      </div>
    </div>
  `).join('');

  loadUnreadCount();
}

// ================================
// CARGAR BANDEJA DE ENVIADOS
// ================================

function loadOutbox() {
  MDT.nui('getOutbox', {}).then(messages => {
    if (messages.error) {
      console.error('Error loading outbox:', messages.error);
      return;
    }

    displayOutbox(messages);
  });
}

function displayOutbox(messages) {
  const container = document.getElementById('outboxList');

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p class="no-results">No sent messages</p>';
    return;
  }

  container.innerHTML = messages.map(msg => `
    <div class="telegram-message" style="background: #f9f9f9;">
      <div class="message-header">
        <span class="message-from">To: ${msg.to_identifier}</span>
        <span class="message-time">${MDT.formatDate(msg.created_at)}</span>
      </div>
      <div class="message-subject">${msg.subject}</div>
      <div class="message-body">${msg.body}</div>
      <div style="margin-top: 6px;">
        <button class="btn" style="padding: 4px 8px; font-size: 10px;" onclick="deleteTelegramMsg(${msg.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

// ================================
// MARCAR COMO LEÍDO
// ================================

function markTelegramRead(telegramId) {
  MDT.nui('markTelegramRead', { telegram_id: telegramId }).then(() => {
    loadInbox();
  });
}

// ================================
// ELIMINAR TELEGRAMA
// ================================

function deleteTelegramMsg(telegramId) {
  if (!confirm('Delete this message?')) return;

  MDT.nui('deleteTelegram', { telegram_id: telegramId }).then(() => {
    MDT.showNotification('Message deleted', 'success');
    loadInbox();
    loadOutbox();
  });
}

// ================================
// CARGAR CONTEO DE NO LEÍDOS
// ================================

function loadUnreadCount() {
  MDT.nui('getUnreadCount', {}).then(count => {
    document.getElementById('telegramBadge').textContent = count || 0;
  });
}

console.log('[Daexv_mdt] Telegram module loaded');
