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
function setProfile(profileToDisplay, currentActiveUser) {
  if (typeof currentActiveUser === 'undefined' || currentActiveUser === null) {
    console.error("CRITICAL: 'currentActiveUser' (expected 'me') is not defined or null when calling setProfile. Profile being viewed:", profileToDisplay);
    return;
  }
  if (!profileToDisplay) {
    console.error("CRITICAL: 'profileToDisplay' is not defined or null when calling setProfile.");
    return;
  }

  $('#profile-avatar').textContent = profileToDisplay.initials;

  const profileNameEl = $('#profile-name');
  const profileBioEl = $('#profile-bio');

  // Always ensure edit fields are removed and text content is displayed initially
  // This handles cases where user was editing, then views another profile, or own profile is re-rendered.
  const editNameInput = $('#edit-profile-name');
  if (editNameInput && editNameInput.parentElement === profileNameEl) profileNameEl.innerHTML = '';
  const editBioTextarea = $('#edit-profile-bio');
  if (editBioTextarea && editBioTextarea.parentElement === profileBioEl) profileBioEl.innerHTML = '';

  profileNameEl.textContent = profileToDisplay.name;
  profileNameEl.classList.remove('hidden'); // Ensure text is visible
  profileBioEl.textContent = profileToDisplay.bio || '';
  profileBioEl.classList.remove('hidden'); // Ensure text is visible


  const profileCodeDisplay = $('#profile-code-display');
  const profileCodeContainer = document.querySelector('.profile-code-container');
  if (profileToDisplay.profileCode) {
    profileCodeDisplay.textContent = profileToDisplay.profileCode;
    if (profileCodeContainer) profileCodeContainer.style.display = 'block';
  } else {
    profileCodeDisplay.textContent = '';
    if (profileCodeContainer) profileCodeContainer.style.display = 'none';
  }

  const editProfileBtn = $('#edit-profile-btn');
  const saveProfileBtn = $('#save-profile-btn');
  const exportRayBtn = $('#export-ray-btn');

  const isOwnProfile = profileToDisplay === currentActiveUser;

  if (isOwnProfile) {
    // Viewing own profile
    editProfileBtn.classList.remove('hidden');
    exportRayBtn.classList.remove('hidden');
    // If save button is visible (meaning edit mode was active), it should be hidden
    // as we are resetting to display mode.
    saveProfileBtn.classList.add('hidden');
  } else {
    // Viewing someone else's profile
    editProfileBtn.classList.add('hidden');
    exportRayBtn.classList.add('hidden');
    saveProfileBtn.classList.add('hidden');
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
    const chatItemsContainer = $('#chat-items-container'); // Target the new container
    if (!chatItemsContainer) {
      console.error("#chat-items-container not found!");
      return;
    }
    chatItemsContainer.innerHTML = ''; // Clear only the items container
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
      chatItemsContainer.appendChild(item); // Append to the new container
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
      setProfile(chat, me); // Pass currentActiveUser (me)
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
        const profileOnClick = m.incoming ? chat : me;
        setProfile(profileOnClick, me); // Pass currentActiveUser (me)
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
    setProfile(me, me); // Pass currentActiveUser (me)
    showScreen('#profile-screen');
  };
  $('#toggle-list').onclick = () => {
    const list = $('#chat-list');
    list.classList.toggle('hidden');
    $('#toggle-list').textContent = list.classList.contains('hidden') ? 'Show Chats' : 'Hide Chats';
  };
  $('#back-to-chat').onclick = () => {
    // If navigating away from profile screen while editing自分のプロフィール (me)
    // and save button is visible (i.e. edit mode is active)
    const saveProfileBtn = $('#save-profile-btn');
    if (!saveProfileBtn.classList.contains('hidden')) {
      // Check if the currently displayed profile on #profile-screen is indeed 'me'
      // This check might be redundant if edit mode is only possible for 'me', but good for safety.
      // We assume if save button is visible, we were editing 'me'.
      setProfile(me, me); // Reset the display for 'me'
    }
    showScreen('#chat-screen');
  };

  $('#edit-profile-btn').addEventListener('click', () => {
    // This button is only visible if it's own profile, so currentActiveUser is 'me'
    const profileNameEl = $('#profile-name');
    const profileBioEl = $('#profile-bio');

    // Check if already in edit mode by looking for one of the inputs
    if ($('#edit-profile-name')) {
        return;
    }

    const currentName = me.name; // 'me' is the user whose profile is being edited
    const currentBio = me.bio || '';

    profileNameEl.innerHTML = `<input type="text" id="edit-profile-name" value="${currentName}" class="profile-edit-input">`;
    profileBioEl.innerHTML = `<textarea id="edit-profile-bio" class="profile-edit-textarea">${currentBio}</textarea>`;

    profileNameEl.classList.add('hidden'); // Hide the original text element
    profileBioEl.classList.add('hidden');   // Hide the original text element


    $('#edit-profile-btn').classList.add('hidden');
    $('#export-ray-btn').classList.add('hidden');
    $('#save-profile-btn').classList.remove('hidden');
  });

  $('#save-profile-btn').addEventListener('click', () => {
    // This button is only visible if it's own profile, so currentActiveUser is 'me'
    const newNameInput = $('#edit-profile-name');
    const newBioTextarea = $('#edit-profile-bio');

    if (!newNameInput || !newBioTextarea) {
        console.error("Could not find edit input fields to save.");
        setProfile(me, me); // Reset profile to a safe state
        return;
    }

    const newName = newNameInput.value.trim();
    const newBio = newBioTextarea.value.trim();

    if (newName) {
      me.name = newName; // 'me' is the user whose profile is being saved
      me.initials = newName.slice(0, 2).toUpperCase();
    }
    me.bio = newBio;

    // The setProfile function will handle removing input fields and showing text
    setProfile(me, me); // Pass currentActiveUser (me)
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
      setProfile(me, me); // Pass currentActiveUser (me)
      showScreen('#profile-screen');
      $('#user-search-input').value = ''; // Clear input
      return;
    }

    // Search in the chats array
    const foundUser = chats.find(chat => chat.profileCode && chat.profileCode === searchCode);

    if (foundUser) {
      loadChat(foundUser.id); // This will eventually call setProfile(foundUser, me)
      // setProfile(foundUser, me); // Pass currentActiveUser (me) - This call is redundant if loadChat calls it
      // showScreen('#profile-screen'); // This is also handled by loadChat -> view-profile click or message click
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
