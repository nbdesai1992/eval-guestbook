'use strict';

const form = document.getElementById('entry-form');
const nameInput = document.getElementById('name');
const messageInput = document.getElementById('message');
const errorBox = document.getElementById('error');
const messagesList = document.getElementById('messages');
const submitBtn = document.getElementById('submit');

const NAME_MAX = 80;
const MESSAGE_MAX = 500;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function entryNode(entry) {
  const li = document.createElement('li');
  li.innerHTML = `
    <div class="msg-head">
      <span class="msg-name">${escapeHtml(entry.name)}</span>
      <span class="msg-time" title="${escapeHtml(entry.created_at)}">${escapeHtml(relativeTime(entry.created_at))}</span>
    </div>
    <p class="msg-body">${escapeHtml(entry.message)}</p>
  `;
  return li;
}

function renderEmpty() {
  messagesList.innerHTML = '<li class="empty">No messages yet. Be the first to sign.</li>';
}

function renderList(entries) {
  messagesList.innerHTML = '';
  if (!entries || entries.length === 0) {
    renderEmpty();
    return;
  }
  for (const entry of entries) {
    messagesList.appendChild(entryNode(entry));
  }
}

function prepend(entry) {
  const empty = messagesList.querySelector('.empty');
  if (empty) messagesList.innerHTML = '';
  messagesList.insertBefore(entryNode(entry), messagesList.firstChild);
}

function showError(msg) {
  errorBox.textContent = msg || '';
}

async function loadEntries() {
  try {
    const res = await fetch('/api/entries');
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    renderList(data);
  } catch (err) {
    messagesList.innerHTML = '<li class="empty">Could not load messages.</li>';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('');

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name || !message) {
    showError('Both name and message are required.');
    return;
  }
  if (name.length > NAME_MAX) {
    showError(`Name must be ${NAME_MAX} characters or fewer.`);
    return;
  }
  if (message.length > MESSAGE_MAX) {
    showError(`Message must be ${MESSAGE_MAX} characters or fewer.`);
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message }),
    });

    if (res.status === 201) {
      const entry = await res.json();
      prepend(entry);
      form.reset();
    } else {
      let msg = 'Something went wrong.';
      try {
        const body = await res.json();
        if (body && body.error) msg = body.error;
      } catch (_) { /* ignore */ }
      showError(msg);
    }
  } catch (err) {
    showError('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
  }
});

loadEntries();
