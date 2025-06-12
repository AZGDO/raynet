// Simple local-storage backed demo implementation of the raynet UI
function $(sel) { return document.querySelector(sel); }

// ----- storage helpers -----
const STORAGE_PROFILE = 'ray_profile';
const STORAGE_CONTACTS = 'ray_contacts';
const STORAGE_MESSAGES = 'ray_messages';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

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
  const connections = {};
  let currentChat = contacts.length ? contacts[0].code : null;

  function renderChatList() {
    const list = $('#chat-list');
    list.innerHTML = '<div class="chat-list-header"><button id="add-contact" class="profile-btn">Add Contact</button><button id="accept-offer" class="profile-btn">Accept Request</button></div>';
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
    const acceptBtn = $('#accept-offer');
    if (acceptBtn) acceptBtn.onclick = () => {
      const txt = prompt('Paste offer from contact:');
      if (txt) acceptOffer(txt);
    };
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
    const connectBtn = $('#connect-contact');
    const finishBtn = $('#finish-connect');
    if (chat && !chat.connected) connectBtn.classList.remove('hidden');
    else connectBtn.classList.add('hidden');
    if (connections[code] && connections[code].awaiting) finishBtn.classList.remove('hidden');
    else finishBtn.classList.add('hidden');
    connectBtn.onclick = () => connectContact(chat);
    finishBtn.onclick = () => {
      const ans = prompt('Paste answer from contact:');
      if (ans) finishConnection(chat, ans);
      finishBtn.classList.add('hidden');
    };
  }

  function addContact() {
    const code = prompt('Enter contact code:');
    if (!code) return;
    if (contacts.find(c => c.code === code)) return;
    const name = prompt('Contact name:') || code;
    const contact = { code, name, initials: name.slice(0, 2).toUpperCase(), bio: '', connected: false };
    contacts.push(contact);
    saveContacts(contacts);
    renderChatList();
    loadChat(code);
  }

  function sendMessage() {
    const input = $('#composer-input');
    if (!input.value.trim() || !currentChat) return;
    const conn = connections[currentChat];
    if (conn && conn.channel && conn.channel.readyState === 'open') {
      conn.channel.send(input.value);
    }
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({ incoming: false, text: input.value });
    saveMessages(messages);
    input.value = '';
    loadChat(currentChat);
    const last = $('#messages').lastElementChild;
    if (last) last.classList.add('new');
  }

  function setupChannel(code, ch) {
    ch.onmessage = e => {
      if (!messages[code]) messages[code] = [];
      messages[code].push({ incoming: true, text: e.data });
      saveMessages(messages);
      if (currentChat === code) loadChat(code);
    };
    ch.onopen = () => {
      const c = contacts.find(x => x.code === code);
      if (c) { c.connected = true; saveContacts(contacts); renderChatList(); }
    };
  }

  async function connectContact(contact) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const channel = pc.createDataChannel('chat');
    setupChannel(contact.code, channel);
    connections[contact.code] = { pc, channel, awaiting: true };
    pc.onicecandidate = ev => {
      if (!ev.candidate) {
        const data = btoa(JSON.stringify({ from: profile.code, to: contact.code, sdp: pc.localDescription.sdp, type: pc.localDescription.type }));
        prompt('Send this offer to your contact:', data);
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  }

  async function acceptOffer(data) {
    let parsed;
    try { parsed = JSON.parse(atob(data)); } catch { alert('invalid data'); return; }
    let contact = contacts.find(c => c.code === parsed.from);
    if (!contact) {
      const name = prompt('Contact name:') || parsed.from;
      contact = { code: parsed.from, name, initials: name.slice(0,2).toUpperCase(), bio: '', connected: false };
      contacts.push(contact);
      saveContacts(contacts);
      renderChatList();
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ondatachannel = e => setupChannel(contact.code, e.channel);
    connections[contact.code] = { pc };
    await pc.setRemoteDescription(new RTCSessionDescription({ type: parsed.type, sdp: parsed.sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    pc.onicecandidate = ev => {
      if (!ev.candidate) {
        const resp = btoa(JSON.stringify({ from: profile.code, to: contact.code, sdp: pc.localDescription.sdp, type: pc.localDescription.type }));
        prompt('Send this answer back to your contact:', resp);
      }
    };
    loadChat(contact.code);
  }

  async function finishConnection(contact, data) {
    let parsed;
    try { parsed = JSON.parse(atob(data)); } catch { alert('invalid data'); return; }
    const conn = connections[contact.code];
    if (!conn) return;
    await conn.pc.setRemoteDescription(new RTCSessionDescription({ type: parsed.type, sdp: parsed.sdp }));
    conn.awaiting = false;
    const c = contacts.find(x => x.code === contact.code);
    if (c) { c.connected = true; saveContacts(contacts); renderChatList(); }
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
