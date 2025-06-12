// Simple local-storage backed demo implementation of the raynet UI
function $(sel) { return document.querySelector(sel); }

// ----- storage helpers -----
const STORAGE_PROFILE = 'ray_profile';
const STORAGE_CONTACTS = 'ray_contacts';
const STORAGE_MESSAGES = 'ray_messages';

function saveProfile(p) {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(p));
}
function loadProfile() {
  const p = localStorage.getItem(STORAGE_PROFILE);
  return p ? JSON.parse(p) : null;
}
function saveContacts(c) {
  localStorage.setItem(STORAGE_CONTACTS, JSON.stringify(c));
}
function loadContacts() {
  const c = localStorage.getItem(STORAGE_CONTACTS);
  return c ? JSON.parse(c) : [];
}
function saveMessages(m) {
  localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(m));
}
function loadMessages() {
  const m = localStorage.getItem(STORAGE_MESSAGES);
  return m ? JSON.parse(m) : {};
}

function generateCode() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  bits = bits.slice(0, 60);
  let out = '';
  for (let i = 0; i < 60; i += 5) {
    out += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out.match(/.{1,4}/g).join('-');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('active');
  });
  const screen = document.querySelector(id);
  screen.classList.remove('hidden');
  requestAnimationFrame(() => screen.classList.add('active'));
}

function setProfile(profile) {
  $('#profile-avatar').textContent = profile.initials;
  $('#profile-name').textContent = profile.name;
  $('#profile-bio').textContent = profile.bio || '';
  $('#profile-code').textContent = profile.code;
}

// ----- main -----
document.addEventListener('DOMContentLoaded', () => {
  let profile = loadProfile();
  if (!profile) {
    profile = { name: 'Guest', initials: 'GU', bio: '', code: generateCode() };
    saveProfile(profile);
  }
  let contacts = loadContacts();
  let messages = loadMessages();
  let currentChat = contacts.length ? contacts[0].code : null;

  function renderChatList() {
    const list = $('#chat-list');
    list.innerHTML = '<div class="chat-list-header"><button id="add-contact" class="profile-btn">Add Contact</button></div>';
    contacts.forEach(c => {
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.dataset.id = c.code;
      item.innerHTML = `
        <div class="avatar">${c.initials}</div>
        <div class="chat-info">
          <div class="chat-title">${c.name}</div>
        </div>`;
      item.addEventListener('click', () => loadChat(c.code));
      list.appendChild(item);
    });
    const addBtn = $('#add-contact');
    if (addBtn) addBtn.onclick = addContact;
  }

  function loadChat(code) {
    currentChat = code;
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    const item = document.querySelector(`.chat-item[data-id="${code}"]`);
    if (item) item.classList.add('active');
    const chat = contacts.find(c => c.code === code);
    $('#chat-title').textContent = chat ? chat.name : code;
    $('#view-profile').onclick = () => {
      setProfile(chat || profile);
      showScreen('#profile-screen');
    };
    const msgs = messages[code] || [];
    const msgBox = $('#messages');
    msgBox.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'message ' + (m.incoming ? 'incoming' : 'outgoing');
      div.textContent = m.text;
      div.addEventListener('click', () => {
        const p = m.incoming ? chat : profile;
        setProfile(p);
        showScreen('#profile-screen');
      });
      msgBox.appendChild(div);
    });
  }

  function addContact() {
    const code = prompt('Enter contact code:');
    if (!code) return;
    if (contacts.find(c => c.code === code)) return;
    const name = prompt('Contact name:') || code;
    const contact = { code, name, initials: name.slice(0, 2).toUpperCase(), bio: '' };
    contacts.push(contact);
    saveContacts(contacts);
    renderChatList();
    loadChat(code);
  }

  function sendMessage() {
    const input = $('#composer-input');
    if (!input.value.trim() || !currentChat) return;
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({ incoming: false, text: input.value });
    saveMessages(messages);
    input.value = '';
    loadChat(currentChat);
    const last = $('#messages').lastElementChild;
    if (last) last.classList.add('new');
  }

  function exportData() {
    const data = { profile, contacts, messages };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raynet-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.profile) { profile = data.profile; saveProfile(profile); }
        if (data.contacts) { contacts = data.contacts; saveContacts(contacts); }
        if (data.messages) { messages = data.messages; saveMessages(messages); }
        renderChatList();
        if (contacts.length) loadChat(contacts[0].code);
      } catch (err) {
        alert('Invalid file');
      }
    };
    reader.readAsText(file);
  }

  $('#copy-code').onclick = () => navigator.clipboard.writeText(profile.code);
  $('#export-ray').onclick = exportData;
  $('#import-ray').addEventListener('change', importData);

  $('#show-login').onclick = () => {
    $('#login-form').classList.remove('hidden');
    $('#register-form').classList.add('hidden');
    $('#guest-form').classList.add('hidden');
  };
  $('#show-register').onclick = () => {
    $('#register-form').classList.remove('hidden');
    $('#login-form').classList.add('hidden');
    $('#guest-form').classList.add('hidden');
  };
  $('#continue-guest').onclick = () => {
    $('#guest-form').classList.remove('hidden');
    $('#login-form').classList.add('hidden');
    $('#register-form').classList.add('hidden');
  };

  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    profile.name = $('#login-name').value || 'Me';
    profile.initials = profile.name.slice(0, 2).toUpperCase();
    saveProfile(profile);
    showScreen('#chat-screen');
    renderChatList();
    if (contacts.length) loadChat(contacts[0].code);
  });

  $('#register-form').addEventListener('submit', e => {
    e.preventDefault();
    profile.name = $('#register-name').value || 'Me';
    profile.initials = profile.name.slice(0, 2).toUpperCase();
    saveProfile(profile);
    showScreen('#chat-screen');
    renderChatList();
    if (contacts.length) loadChat(contacts[0].code);
  });

  $('#guest-form').addEventListener('submit', e => {
    e.preventDefault();
    profile.name = $('#guest-name').value || 'Guest';
    profile.initials = profile.name.slice(0, 2).toUpperCase();
    saveProfile(profile);
    showScreen('#chat-screen');
    renderChatList();
    if (contacts.length) loadChat(contacts[0].code);
  });

  $('#my-profile').onclick = () => {
    setProfile(profile);
    showScreen('#profile-screen');
  };
  $('#toggle-list').onclick = () => {
    const list = $('#chat-list');
    list.classList.toggle('hidden');
    $('#toggle-list').textContent = list.classList.contains('hidden') ? 'Show Chats' : 'Hide Chats';
  };
  $('#back-to-chat').onclick = () => showScreen('#chat-screen');
  $('#send-btn').onclick = sendMessage;

  renderChatList();
  if (currentChat) loadChat(currentChat);
});
