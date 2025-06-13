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
function setProfile(profile) {
  $('#profile-avatar').textContent = profile.initials;

  // Clear previous edit fields if any
  const profileNameEl = $('#profile-name');
  const profileBioEl = $('#profile-bio');
  profileNameEl.innerHTML = ''; // Clear potential input fields
  profileBioEl.innerHTML = '';   // Clear potential input fields
  profileNameEl.textContent = profile.name;
  profileBioEl.textContent = profile.bio || '';

  // Display profile code if it exists
  const profileCodeDisplay = $('#profile-code-display');
  const profileCodeContainer = document.querySelector('.profile-code-container');
  if (profile.profileCode) {
    profileCodeDisplay.textContent = profile.profileCode;
    if (profileCodeContainer) profileCodeContainer.style.display = 'block';
  } else {
    profileCodeDisplay.textContent = '';
    if (profileCodeContainer) profileCodeContainer.style.display = 'none';
  }

  // Handle button visibility based on whether it's 'me'
  const editProfileBtn = $('#edit-profile-btn');
  const saveProfileBtn = $('#save-profile-btn');
  const exportRayBtn = $('#export-ray-btn');

  if (profile === me) {
    editProfileBtn.classList.remove('hidden');
    exportRayBtn.classList.remove('hidden');
    // Ensure save button is hidden unless actively editing
    if (!saveProfileBtn.classList.contains('hidden')) {
        // This case implies we were editing, then viewed another profile, then came back.
        // Reset by hiding save and showing edit.
        saveProfileBtn.classList.add('hidden');
    }
  } else {
    editProfileBtn.classList.add('hidden');
    saveProfileBtn.classList.add('hidden');
    exportRayBtn.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const E2E_MESSAGE_KEY = "raynetSecretKey"; // Fixed key for message "encryption"

  const chats = [
    { id: 'ray', name: 'Ray Adams', subtitle: 'Hey, have you seen this?', timestamp: '09:32', initials: 'RA', bio: 'Lead dev at Raynet', profileCode: 'AB-CD-EF-12-34-56' },
    { id: 'lana', name: 'Lana Norris', subtitle: "I'll call you back.", timestamp: 'Yesterday', initials: 'LN', bio: 'Designer at Raynet', profileCode: 'ZY-XW-VU-98-76-54' }
  ];
  const messages = {
    ray: [
      { incoming: true, text: xorEncryptDecrypt('Hey there!', E2E_MESSAGE_KEY) },
      { incoming: false, text: xorEncryptDecrypt("Hi! How's it going?", E2E_MESSAGE_KEY) },
      { incoming: true, text: xorEncryptDecrypt('All good, thanks.', E2E_MESSAGE_KEY) }
    ],
    lana: [
      { incoming: true, text: xorEncryptDecrypt("Let's talk later.", E2E_MESSAGE_KEY) },
      { incoming: false, text: xorEncryptDecrypt('Sure, talk soon.', E2E_MESSAGE_KEY) }
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
    const chat = chats.find(c => c.id === id);
    $('#chat-title').textContent = chat ? chat.name : id;
    $('#view-profile').onclick = () => {
      setProfile(chat);
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
      // Decrypt message before displaying
      const decryptedText = xorEncryptDecrypt(m.text, E2E_MESSAGE_KEY);
      div.textContent = decryptedText;
      div.addEventListener('click', () => {
        const profile = m.incoming ? chat : me;
        setProfile(profile);
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
    me.profileCode = generateProfileCode(); // Generate and store profile code
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
  });

  $('#guest-form').addEventListener('submit', e => {
    e.preventDefault();
    me.name = $('#guest-name').value || 'Guest';
    me.initials = me.name.slice(0,2).toUpperCase();
    showScreen('#chat-screen');
    renderChatList();
    loadChat(currentChat);
  });

  $('#my-profile').onclick = () => {
    setProfile(me);
    showScreen('#profile-screen');
  };
  $('#toggle-list').onclick = () => {
    const list = $('#chat-list');
    list.classList.toggle('hidden');
    $('#toggle-list').textContent = list.classList.contains('hidden') ? 'Show Chats' : 'Hide Chats';
  };
  $('#back-to-chat').onclick = () => {
    // If navigating away from profile screen while editing, reset edit state
    if (!$('#save-profile-btn').classList.contains('hidden')) {
      setProfile(me); // This will reset the fields and button states
    }
    showScreen('#chat-screen');
  };

  $('#edit-profile-btn').addEventListener('click', () => {
    if (document.getElementById('profile-screen').querySelector('#edit-profile-name')) {
      return; // Already in edit mode
    }

    const profileNameEl = $('#profile-name');
    const profileBioEl = $('#profile-bio');

    const currentName = me.name;
    const currentBio = me.bio || '';

    profileNameEl.innerHTML = `<input type="text" id="edit-profile-name" value="${currentName}" class="profile-edit-input">`;
    profileBioEl.innerHTML = `<textarea id="edit-profile-bio" class="profile-edit-textarea">${currentBio}</textarea>`;

    $('#edit-profile-btn').classList.add('hidden');
    $('#export-ray-btn').classList.add('hidden'); // Hide export btn during edit
    $('#save-profile-btn').classList.remove('hidden');
  });

  // Placeholder for save profile and export functions
  $('#save-profile-btn').addEventListener('click', () => {
    const newName = $('#edit-profile-name').value.trim();
    const newBio = $('#edit-profile-bio').value.trim();

    if (newName) {
      me.name = newName;
      me.initials = newName.slice(0, 2).toUpperCase();
    }
    me.bio = newBio;

    setProfile(me); // This will redraw the profile, remove input fields, and reset buttons
  });

  function xorEncryptDecrypt(input, key) {
    let output = '';
    for (let i = 0; i < input.length; i++) {
      output += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return output;
  }

  function exportToRayFile() {
    const password = prompt("Enter a password to encrypt your .ray file:", "");
    if (!password) {
      alert("Password is required to export. Export cancelled.");
      return;
    }

    const dataToExport = {
      me: me,
      messages: messages // Assuming 'messages' is accessible in this scope
    };

    const jsonString = JSON.stringify(dataToExport);
    const encryptedData = xorEncryptDecrypt(jsonString, password);

    const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profile_backup.ray';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Profile exported to profile_backup.ray!");
  }

  $('#export-ray-btn').addEventListener('click', () => {
    exportToRayFile();
  });

  function generateProfileCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Format as XX-XX-XX-XX-XX-XX
    return code.match(/.{1,2}/g).join('-');
  }

  function searchUserByCode(searchCode) {
    if (!searchCode || searchCode.trim() === '') {
      alert("Please enter a profile code to search.");
      return;
    }
    searchCode = searchCode.trim();

    // Check if it's the current user
    if (me.profileCode && me.profileCode === searchCode) {
      alert("You found yourself! Displaying your profile.");
      setProfile(me);
      showScreen('#profile-screen');
      $('#user-search-input').value = ''; // Clear input
      return;
    }

    // Search in the chats array
    const foundUser = chats.find(chat => chat.profileCode && chat.profileCode === searchCode);

    if (foundUser) {
      loadChat(foundUser.id); // Load their chat messages
      setProfile(foundUser);  // Set their profile details
      showScreen('#profile-screen'); // Navigate to profile screen
      $('#user-search-input').value = ''; // Clear input
    } else {
      alert("User with that profile code not found.");
      $('#user-search-input').value = ''; // Clear input
    }
  }

  $('#user-search-btn').addEventListener('click', () => {
    const searchCode = $('#user-search-input').value;
    searchUserByCode(searchCode);
  });

  $('#send-btn').onclick = () => {
    const input = $('#composer-input');
    const plainText = input.value.trim();
    if (!plainText) return;

    if (!messages[currentChat]) messages[currentChat] = [];

    // Encrypt message before storing
    const encryptedText = xorEncryptDecrypt(plainText, E2E_MESSAGE_KEY);
    messages[currentChat].push({ incoming: false, text: encryptedText });

    input.value = '';
    loadChat(currentChat);
    const last = $('#messages').lastElementChild;
    if (last) last.classList.add('new');
  };
});
