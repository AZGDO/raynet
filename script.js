function $(sel) { return document.querySelector(sel); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
  document.querySelector(id).classList.remove('hidden');
}
function setProfile(profile) {
  $('#profile-avatar').textContent = profile.initials;
  $('#profile-name').textContent = profile.name;
  $('#profile-bio').textContent = profile.bio || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const chats = [
    { id: 'ray', name: 'Ray Adams', subtitle: 'Hey, have you seen this?', timestamp: '09:32', initials: 'RA', bio: 'Lead dev at Raynet' },
    { id: 'lana', name: 'Lana Norris', subtitle: "I'll call you back.", timestamp: 'Yesterday', initials: 'LN', bio: 'Designer at Raynet' }
  ];
  const messages = {
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
  let me = { name: 'Guest', initials: 'GU', bio: 'Just visiting Raynet' };
  let currentChat = 'ray';

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
    const msgs = messages[id] || [];
    const msgBox = $('#messages');
    msgBox.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'message ' + (m.incoming ? 'incoming' : 'outgoing');
      div.textContent = m.text;
      div.addEventListener('click', () => {
        const profile = m.incoming ? chats.find(c => c.id === id) : me;
        setProfile(profile);
        showScreen('#profile-screen');
      });
      msgBox.appendChild(div);
    });
  }

  $('#show-login').onclick = () => {
    $('#login-form').classList.remove('hidden');
    $('#register-form').classList.add('hidden');
  };
  $('#show-register').onclick = () => {
    $('#register-form').classList.remove('hidden');
    $('#login-form').classList.add('hidden');
  };
  $('#continue-guest').onclick = () => {
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
  };

  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    me.name = $('#login-name').value || 'Me';
    me.initials = me.name.slice(0,2).toUpperCase();
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
  });

  $('#register-form').addEventListener('submit', e => {
    e.preventDefault();
    me.name = $('#register-name').value || 'Me';
    me.initials = me.name.slice(0,2).toUpperCase();
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
  });

  $('#my-profile').onclick = () => {
    setProfile(me);
    showScreen('#profile-screen');
  };
  $('#back-to-chat').onclick = () => showScreen('#chat-screen');
  $('#send-btn').onclick = () => {
    const input = $('#composer-input');
    if (!input.value.trim()) return;
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({ incoming: false, text: input.value });
    input.value = '';
    loadChat(currentChat);
  };
});
