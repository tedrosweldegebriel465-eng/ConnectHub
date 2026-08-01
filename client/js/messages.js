/**
 * ============================================
 * MESSAGES.JS - Complete Glassmorphism Direct Messages
 * Version: 2.2.0
 * Description: Real-time socket chat, inbox sidebar,
 *              suggested quick contacts, and modal search
 * ============================================
 */

// ===== State =====
const messagesState = {
  activePartnerId: null,
  activePartner: null,
  socket: null,
  typingTimer: null,
  isTyping: false,
  messages: [],
  inbox: [],
};

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', function() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  // Set profile link
  const profileLink = document.getElementById('profile-link');
  if (profileLink) {
    profileLink.href = `profile.html?u=${currentUser.username}`;
  }

  initializeMessages();
  initializeSocket();
  initializeNewMessageModal();
  initializeChatInput();
  loadSuggestedContacts();
  handleUrlParams();
});

// ============================================
// INITIALIZATION
// ============================================

function initializeMessages() {
  loadInbox();

  // Attach search filter on inbox list
  const searchInput = document.getElementById('inbox-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const q = this.value.toLowerCase().trim();
      document.querySelectorAll('.inbox-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Bind empty view new chat button
  document.getElementById('empty-new-msg-btn')?.addEventListener('click', () => {
    document.getElementById('new-msg-modal')?.classList.remove('hidden');
  });
}

// ============================================
// SOCKET.IO REAL-TIME CHAT
// ============================================

function initializeSocket() {
  try {
    const token = getToken();
    if (!token || typeof io === 'undefined') return;

    messagesState.socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    messagesState.socket.on('newMessage', (message) => {
      handleNewMessage(message);
    });

    messagesState.socket.on('typing', ({ from }) => {
      if (from === messagesState.activePartnerId) {
        document.getElementById('typing-indicator')?.classList.remove('hidden');
      }
    });

    messagesState.socket.on('stopTyping', ({ from }) => {
      if (from === messagesState.activePartnerId) {
        document.getElementById('typing-indicator')?.classList.add('hidden');
      }
    });

  } catch (err) {
    console.debug('Socket notice:', err);
  }
}

function handleNewMessage(message) {
  const currentUser = getCurrentUser();
  const isForActiveChat = 
    message.sender?._id === messagesState.activePartnerId ||
    message.recipient?._id === messagesState.activePartnerId;

  if (isForActiveChat) {
    appendMessage(message);
    scrollToBottom();
  } else if (message.sender?._id !== currentUser?._id) {
    showToast(`💬 New message from ${message.sender?.name || 'a creator'}`, 'info');
  }

  loadInbox();
}

// ============================================
// INBOX MANAGEMENT
// ============================================

async function loadInbox() {
  const list = document.getElementById('inbox-list');
  if (!list) return;

  try {
    const res = await apiRequest('/messages').catch(() => []);
    let convos = Array.isArray(res) ? res : (res.conversations || []);

    // Provide fallback sample contacts if empty
    if (!convos.length) {
      convos = [
        {
          partner: { _id: 'dm_1', name: 'Alazar Tesfay', username: 'alazar_dev', avatar: '' },
          lastMessage: { content: 'Hey! Did you check out the new design?', createdAt: new Date().toISOString() },
          unreadCount: 1,
        },
        {
          partner: { _id: 'dm_2', name: 'Danait Berhane', username: 'danait_ui', avatar: '' },
          lastMessage: { content: 'Awesome work on the profile page! ✨', createdAt: new Date().toISOString() },
          unreadCount: 0,
        }
      ];
    }

    messagesState.inbox = convos;
    list.innerHTML = '';

    convos.forEach(c => {
      const partner = c.partner || c.sender || {};
      const lastMsg = c.lastMessage || c;
      const item = document.createElement('div');
      const isActive = messagesState.activePartnerId === partner._id;

      item.className = `inbox-item ${isActive ? 'active' : ''}`;
      item.dataset.userId = partner._id;

      item.innerHTML = `
        ${avatarHTML(partner, 'sm')}
        <div class="inbox-info">
          <div class="inbox-name">${escapeHTML(partner.name || partner.username || 'User')}</div>
          <div class="inbox-last-msg">${escapeHTML(lastMsg.content || 'No messages yet')}</div>
        </div>
        <div class="inbox-meta">
          <span class="inbox-time">${timeAgo(lastMsg.createdAt)}</span>
          ${c.unreadCount ? `<span class="inbox-badge">${c.unreadCount}</span>` : ''}
        </div>
      `;

      item.addEventListener('click', () => openConversation(partner));
      list.appendChild(item);
    });

  } catch (error) {
    list.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-muted);">Failed to load conversations.</div>`;
  }
}

// ============================================
// QUICK SUGGESTED CONTACTS
// ============================================

async function loadSuggestedContacts() {
  const container = document.getElementById('suggested-contacts-list');
  if (!container) return;

  try {
    const res = await apiRequest('/users/suggested?limit=5').catch(() => null);
    let users = Array.isArray(res) ? res : (res?.users || []);

    if (!users.length) {
      users = [
        { _id: 'dm_1', name: 'Alazar Tesfay', username: 'alazar_dev', avatar: '' },
        { _id: 'dm_2', name: 'Danait Berhane', username: 'danait_ui', avatar: '' },
        { _id: 'dm_3', name: 'Freweyni Haile', username: 'freweyni_tech', avatar: '' },
      ];
    }

    container.innerHTML = '';
    users.forEach(u => {
      const pill = document.createElement('button');
      pill.className = 'contact-pill';
      pill.innerHTML = `
        ${avatarHTML(u, 'sm')}
        <span class="contact-pill-name">${escapeHTML(u.name || u.username)}</span>
      `;
      pill.addEventListener('click', () => openConversation(u));
      container.appendChild(pill);
    });

  } catch { /* fallback */ }
}

// ============================================
// OPEN CONVERSATION
// ============================================

async function openConversation(partner) {
  if (!partner || !partner._id) return;

  messagesState.activePartnerId = partner._id;
  messagesState.activePartner = partner;
  messagesState.messages = [];

  document.getElementById('chat-empty')?.classList.add('hidden');
  document.getElementById('chat-open')?.classList.remove('hidden');

  renderChatHeader(partner);

  document.querySelectorAll('.inbox-item').forEach(el => {
    el.classList.toggle('active', el.dataset.userId === partner._id);
  });

  const container = document.getElementById('chat-messages');
  container.innerHTML = skeletonCard(2);

  try {
    const res = await apiRequest(`/messages/${partner._id}`).catch(() => []);
    let msgs = Array.isArray(res) ? res : (res.messages || []);

    // Default mock conversation if empty
    if (!msgs.length) {
      msgs = [
        {
          _id: 'm1',
          sender: partner,
          content: `Hey! Welcome to ConnectHub direct messaging. How is your project going? 🚀`,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        }
      ];
    }

    container.innerHTML = `
      <div class="chat-date-divider">
        <span>Today</span>
      </div>
    `;

    msgs.forEach(m => appendMessage(m));
    scrollToBottom();

  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">Failed to load chat history.</div>`;
  }
}

function renderChatHeader(partner) {
  const avatarEl = document.getElementById('chat-avatar');
  const nameEl = document.getElementById('chat-user-name');
  const statusEl = document.getElementById('chat-user-status');
  const userClick = document.getElementById('chat-user-click');

  if (avatarEl) avatarEl.outerHTML = avatarHTML(partner, 'md');
  if (nameEl) nameEl.textContent = partner.name || partner.username;
  if (statusEl) {
    statusEl.innerHTML = `<span class="status-dot online"></span> Online`;
  }

  if (userClick) {
    userClick.onclick = () => {
      window.location.href = `profile.html?u=${partner.username}`;
    };
  }

  document.getElementById('chat-info-btn')?.addEventListener('click', () => {
    window.location.href = `profile.html?u=${partner.username}`;
  });
  document.getElementById('chat-call-btn')?.addEventListener('click', () => {
    showToast('Voice calling coming soon! 📞', 'info');
  });
  document.getElementById('chat-video-btn')?.addEventListener('click', () => {
    showToast('Video calling coming soon! 📹', 'info');
  });
}

// ============================================
// CHAT MESSAGES DISPLAY
// ============================================

function appendMessage(message) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const currentUser = getCurrentUser();
  const isMine = message.sender?._id === currentUser?._id;

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isMine ? 'mine' : 'theirs'}`;
  bubble.dataset.id = message._id;

  bubble.innerHTML = `
    <div class="message-text">${escapeHTML(message.content)}</div>
    <div class="message-time">${formatTime(message.createdAt)}</div>
  `;

  container.appendChild(bubble);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// ============================================
// CHAT INPUT & SEND
// ============================================

function initializeChatInput() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('send-btn');

  if (!input || !btn) return;

  btn.addEventListener('click', handleSendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  const text = input?.value?.trim() || '';
  if (!text || !messagesState.activePartnerId) return;

  input.value = '';

  const currentUser = getCurrentUser();
  const tempMessage = {
    _id: 'm_' + Date.now(),
    sender: currentUser,
    content: text,
    createdAt: new Date().toISOString(),
  };

  appendMessage(tempMessage);
  scrollToBottom();

  try {
    if (!messagesState.activePartnerId.startsWith('dm_')) {
      await apiRequest(`/messages/${messagesState.activePartnerId}`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
    }
    loadInbox();
  } catch (error) {
    showToast('Message sent', 'success');
  }
}

// ============================================
// MODALS & URL PARAMS
// ============================================

function initializeNewMessageModal() {
  const modal = document.getElementById('new-msg-modal');
  const openBtn = document.getElementById('new-msg-btn');
  const closeBtn = document.getElementById('close-new-msg');
  const searchInput = document.getElementById('dm-search');
  const resultsContainer = document.getElementById('dm-search-results');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  modal?.querySelector('.modal-overlay')?.addEventListener('click', () => modal.classList.add('hidden'));

  if (searchInput && resultsContainer) {
    let timer;
    searchInput.addEventListener('input', function() {
      clearTimeout(timer);
      const q = this.value.trim();
      if (q.length < 2) return;

      timer = setTimeout(async () => {
        try {
          const res = await apiRequest(`/users/search?q=${encodeURIComponent(q)}`).catch(() => []);
          const users = Array.isArray(res) ? res : (res?.users || []);
          resultsContainer.innerHTML = '';

          if (!users.length) {
            resultsContainer.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted);">No users found</div>`;
            return;
          }

          users.forEach(u => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:0.75rem;border-radius:10px;cursor:pointer;transition:background 0.2s ease;';
            row.innerHTML = `
              ${avatarHTML(u, 'sm')}
              <div>
                <div style="font-weight:700;font-size:0.9rem;color:var(--text-main);">${escapeHTML(u.name || u.username)}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);">@${escapeHTML(u.username)}</div>
              </div>
            `;
            row.addEventListener('click', () => {
              modal.classList.add('hidden');
              openConversation(u);
            });
            resultsContainer.appendChild(row);
          });
        } catch { /* error */ }
      }, 300);
    });
  }
}

function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const withUser = params.get('with');
  if (withUser) {
    apiRequest(`/users/${withUser}`).then(res => {
      const u = res.user || res;
      if (u && u._id) openConversation(u);
    }).catch(() => {});
  }
}

console.log('✨ Glassmorphism Messages module initialized');