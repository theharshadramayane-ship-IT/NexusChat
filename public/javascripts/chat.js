var socket;
var myUserName;

// DOM Elements
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const usersList = document.getElementById('usersList');
const msgWindow = document.getElementById('msgWindow');
const chatTargetName = document.getElementById('chatTargetName');
const chatTargetStatus = document.getElementById('chatTargetStatus');
const myUsernameDisplay = document.getElementById('myUsernameDisplay');
const myAvatar = document.getElementById('myAvatar');

let currentTarget = "All";

// Connect to Socket.IO
socket = io();

// Helper: Generate Random Colors for Avatars
function getAvatarColor(name) {
  const colors = ['#7C3AED', '#2563EB', '#06B6D4', '#22C55E', '#EF4444', '#F59E0B'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

function enableInputs(enable) {
  msgInput.disabled = !enable;
  sendBtn.disabled = !enable;
}

function setUsername() {
  if (!myUserName) return;
  
  myUsernameDisplay.textContent = myUserName;
  myAvatar.textContent = myUserName.charAt(0).toUpperCase();
  myAvatar.style.background = getAvatarColor(myUserName);
  
  socket.emit('set username', myUserName, function(data) {
    console.log('emit set username', data);
  });
}

function appendNewMessage(msg) {
  const isSentByMe = (msg.source === myUserName);
  const isSystem = (msg.source === 'System');
  
  const msgDiv = document.createElement('div');
  
  if (isSystem) {
    msgDiv.className = `message-bubble system-msg`;
    msgDiv.innerHTML = `${msg.message}`;
  } else {
    msgDiv.className = `message-bubble ${isSentByMe ? 'sent' : 'received'}`;
    
    let innerHTML = `<span class="sender">${msg.source}</span>`;
    
    if (msg.target !== "All") {
      innerHTML += `<span style="font-size: 0.7rem; opacity: 0.8; margin-left: 8px;">(Private)</span>`;
    }
    
    innerHTML += `<div>${msg.message}</div>`;
    msgDiv.innerHTML = innerHTML;
  }
  
  msgWindow.appendChild(msgDiv);
  msgWindow.scrollTop = msgWindow.scrollHeight; 
}

function appendNewUser(uName, notify) {
  if (uName === myUserName) return; 
  if (document.querySelector(`.user-item[data-user="${uName}"]`)) return;

  const li = document.createElement('li');
  li.className = 'user-item';
  li.dataset.user = uName;
  
  li.innerHTML = `
    <div class="avatar" style="background: ${getAvatarColor(uName)}; width: 32px; height: 32px; font-size: 1rem;">${uName.charAt(0).toUpperCase()}</div>
    <span>${uName}</span>
  `;
  
  li.addEventListener('click', () => selectUser(uName, li));
  usersList.appendChild(li);

  if (notify) {
    appendNewMessage({ source: 'System', message: `${uName} joined the chat` });
  }
}

function handleUserLeft(msg) {
  const userEl = document.querySelector(`.user-item[data-user="${msg.userName}"]`);
  if (userEl) {
    userEl.remove();
    appendNewMessage({ source: 'System', message: `${msg.userName} left the chat` });
    
    if (currentTarget === msg.userName) {
      const globalBtn = document.querySelector('.user-item[data-user="All"]');
      selectUser("All", globalBtn);
    }
  }
}

function selectUser(uName, element) {
  currentTarget = uName;
  
  document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  
  if (uName === "All") {
    chatTargetName.textContent = "Global Chat";
    chatTargetStatus.textContent = "Public Room";
  } else {
    chatTargetName.textContent = uName;
    chatTargetStatus.textContent = "Private Conversation";
  }

  // Mobile View: Close sidebar when a user is clicked
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');
  }
}

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit('message', {
    "inferSrcUser": true,
    "source": "",
    "message": text,
    "target": currentTarget
  });
  
  msgInput.value = "";
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  enableInputs(false);
  myUserName = username; 
  setUsername();

  // Mobile Sidebar Toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
    });
  }

  const globalChatBtn = document.querySelector('.user-item[data-user="All"]');
  globalChatBtn.addEventListener('click', () => selectUser("All", globalChatBtn));

  // Socket Events
  socket.on('userJoined', function(msg) {
    appendNewUser(msg.userName, true);
  });
  
  socket.on('userLeft', function(msg) {
    handleUserLeft(msg);
  });

  socket.on('message', function(msg) {
    if (msg.target === "All" || msg.target === myUserName || msg.source === myUserName) {
      appendNewMessage(msg);
    }
  });

  socket.on('welcome', function(msg) {
    const users = JSON.parse(msg.currentUsers);
    users.forEach(name => appendNewUser(name, false));
    enableInputs(true);
  });

  socket.on('error', function(msg) {
    if (msg.userNameInUse) {
      alert("Username already in use. Redirecting to login.");
      window.location.href = '/';
    }
  });

  // Input Events
  sendBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
});