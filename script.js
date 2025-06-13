function $(sel) { return document.querySelector(sel); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('active');
  });
  const screen = document.querySelector(id);
  screen.classList.remove('hidden');
  requestAnimationFrame(() => screen.classList.add('active'));
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i > 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function encryptData(text, password) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, data);
  const out = new Uint8Array(salt.byteLength + iv.byteLength + ct.byteLength);
  out.set(salt, 0);
  out.set(iv, salt.byteLength);
  out.set(new Uint8Array(ct), salt.byteLength + iv.byteLength);
  return out;
}

async function decryptData(buffer, password) {
  const salt = buffer.slice(0,16);
  const iv = buffer.slice(16,28);
  const data = buffer.slice(28);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), {name:'PBKDF2'}, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, data);
  return new TextDecoder().decode(pt);
}
function setProfile(profile) {
  $('#profile-avatar').textContent = profile.initials;
  $('#profile-name').textContent = profile.name;
  $('#profile-bio').textContent = profile.bio || '';
  $('#profile-code').textContent = profile.code || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const profiles = {};
  let chats = [
    { id: 'ray', name: 'Ray Adams', subtitle: 'Hey, have you seen this?', timestamp: '09:32', initials: 'RA', bio: 'Lead dev at Raynet', code: generateCode() },
    { id: 'lana', name: 'Lana Norris', subtitle: "I'll call you back.", timestamp: 'Yesterday', initials: 'LN', bio: 'Designer at Raynet', code: generateCode() }
  ];
  let messages = {
    ray: [
      { incoming: true, text: 'Hey there!' },
      { incoming: false, text: "Hi! How's it going?" },
      { incoming: true, text: 'All good, thanks.' }
    ],
    lana: [
      { incoming: true, text: "Let's talk later." },
      { incoming: false, text: 'Sure, talk soon.' }
    ]
  };
  let requests = {};
  let me = { name: 'Guest', initials: 'GU', bio: 'Just visiting Raynet', code: generateCode(), password: '' };
  chats.forEach(c => { profiles[c.id] = c; });
  let currentChat = 'ray';

  function checkRequests() {
    const list = requests[me.code] || [];
    while (list.length) {
      const req = list.shift();
      if (confirm(`${req.name} wants to connect. Accept?`)) {
        if (!profiles[req.id]) {
          profiles[req.id] = { id: req.id, name: req.name, code: req.code, initials: req.name.slice(0,2).toUpperCase() };
        }
        if (!chats.find(c => c.id === req.id)) {
          chats.push(profiles[req.id]);
          messages[req.id] = [];
          renderChatList();
        }
        loadChat(req.id);
      }
    }
  }

  function renderChatList() {
    const list = $('#chat-list');
    list.innerHTML = '';
    chats.forEach(c => {
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.dataset.id = c.id;
      item.innerHTML = `
        <div class="avatar">${c.initials}</div>
        <div class="chat-info">
          <div class="chat-title">${c.name}</div>
          <div class="chat-subtitle">${c.subtitle}</div>
        </div>
        <div class="chat-timestamp">${c.timestamp}</div>`;
      item.addEventListener('click', () => loadChat(c.id));
      list.appendChild(item);
    });
  }

  function loadChat(id) {
    currentChat = id;
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    const item = document.querySelector(`.chat-item[data-id="${id}"]`);
    if (item) item.classList.add('active');
    const chat = chats.find(c => c.id === id);
    $('#chat-title').textContent = chat ? chat.name : id;
    $('#view-profile').onclick = () => {
      setProfile(chat);
      $('#edit-profile').classList.add('hidden');
      $('#export-profile').classList.add('hidden');
      $('#profile-edit').classList.add('hidden');
      $('#profile-view').classList.remove('hidden');
      showScreen('#profile-screen');
    };
    const msgs = messages[id] || [];
    const msgBox = $('#messages');
    msgBox.classList.add('switching');
    setTimeout(() => msgBox.classList.remove('switching'), 300);
    msgBox.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'message ' + (m.incoming ? 'incoming' : 'outgoing');
      div.textContent = m.text;
      div.addEventListener('click', () => {
        const profile = m.incoming ? chat : me;
        setProfile(profile);
        if (profile === me) {
          $('#edit-profile').classList.remove('hidden');
          $('#export-profile').classList.remove('hidden');
        } else {
          $('#edit-profile').classList.add('hidden');
          $('#export-profile').classList.add('hidden');
        }
        $('#profile-edit').classList.add('hidden');
        $('#profile-view').classList.remove('hidden');
        showScreen('#profile-screen');
      });
      msgBox.appendChild(div);
    });
  }

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

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const file = $('#login-file').files[0];
    const pass = $('#login-pass').value || '';
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    try {
      const text = await decryptData(buf, pass);
      const data = JSON.parse(text);
      chats = data.chats || [];
      messages = data.messages || {};
      requests = data.requests || {};
      me = data.me || me;
      me.password = pass;
      chats.forEach(c => { profiles[c.id] = c; });
      profiles.me = me;
      showScreen('#chat-screen');
      renderChatList();
      loadChat(chats[0] ? chats[0].id : currentChat);
      checkRequests();
    } catch(err) {
      alert('Failed to load file');
    }
  });

  $('#register-form').addEventListener('submit', e => {
    e.preventDefault();
    me.name = $('#register-name').value || 'Me';
    me.password = $('#register-pass').value || '';
    me.initials = me.name.slice(0,2).toUpperCase();
    if (!me.code) me.code = generateCode();
    profiles.me = me;
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
    checkRequests();
  });

  $('#guest-form').addEventListener('submit', e => {
    e.preventDefault();
    me.name = $('#guest-name').value || 'Guest';
    me.initials = me.name.slice(0,2).toUpperCase();
    if (!me.code) me.code = generateCode();
    profiles.me = me;
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
    checkRequests();
  });

  $('#my-profile').onclick = () => {
    setProfile(me);
    $('#edit-profile').classList.remove('hidden');
    $('#export-profile').classList.remove('hidden');
    $('#profile-edit').classList.add('hidden');
    $('#profile-view').classList.remove('hidden');
    showScreen('#profile-screen');
  };
  $('#toggle-list').onclick = () => {
    const list = $('#chat-list');
    list.classList.toggle('hidden');
    $('#toggle-list').textContent = list.classList.contains('hidden') ? 'Show Chats' : 'Hide Chats';
  };
  $('#back-to-chat').onclick = () => showScreen('#chat-screen');
  $('#edit-profile').onclick = () => {
    $('#profile-edit').classList.remove('hidden');
    $('#profile-view').classList.add('hidden');
    $('#edit-name').value = me.name;
    $('#edit-bio').value = me.bio;
  };
  $('#profile-edit').addEventListener('submit', e => {
    e.preventDefault();
    me.name = $('#edit-name').value || me.name;
    me.bio = $('#edit-bio').value;
    me.initials = me.name.slice(0,2).toUpperCase();
    profiles.me = me;
    setProfile(me);
    $('#profile-edit').classList.add('hidden');
    $('#profile-view').classList.remove('hidden');
    renderChatList();
  });
  $('#export-profile').onclick = async () => {
    if (!me.password) {
      me.password = prompt('Enter a password for encryption') || '';
    }
    const data = JSON.stringify({ me, chats, messages, requests });
    const buf = await encryptData(data, me.password);
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'profile.ray';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#send-btn').onclick = () => {
    const input = $('#composer-input');
    if (!input.value.trim()) return;
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({ incoming: false, text: input.value });
    input.value = '';
    loadChat(currentChat);
    const last = $('#messages').lastElementChild;
    if (last) last.classList.add('new');
  };
  $('#find-user').onclick = () => {
    const code = $('#code-search').value.trim().toUpperCase();
    const result = $('#search-result');
    result.innerHTML = '';
    if (!code) { result.classList.add('hidden'); return; }
    const prof = Object.values(profiles).find(p => p.code === code && p !== me);
    if (prof) {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.innerHTML = `<div class="avatar">${prof.initials}</div><div>${prof.name}</div><button>Connect</button>`;
      div.querySelector('button').onclick = () => {
        if (!requests[prof.code]) requests[prof.code] = [];
        requests[prof.code].push({ id: me.id || 'me', code: me.code, name: me.name });
        alert('Request sent');
        result.classList.add('hidden');
      };
      result.appendChild(div);
    } else {
      result.textContent = 'User not found';
    }
    result.classList.remove('hidden');
  };

  setInterval(checkRequests, 5000);
});
