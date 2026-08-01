/**
 * ============================================
 * UTILS.JS - Shared Utilities Module
 * Version: 2.0.0
 * Description: Common utility functions used
 *              across the entire application
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================

const API = window.API_BASE_URL || "/api";

const APP_CONFIG = {
  name: '⚡ ConnectHub',
  version: '2.0.0',
  maxToastDuration: 3500,
  minToastDuration: 1500,
  searchDebounce: 300,
  notificationInterval: 30000,
};

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Get authentication token from sessionStorage (httpOnly cookie fallback via credentials)
 * @returns {string|null} JWT token or null
 */
function getToken() {
  if (window.AuthStorage?.getToken()) return window.AuthStorage.getToken();
  return sessionStorage.getItem('token');
}

/**
 * Get current user from localStorage
 * Handles both shapes: direct user object and wrapped {success,token,user:{}}
 */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Handle wrapped response: {success:true, token:'...', user:{_id,username,...}}
    if (parsed && parsed.user && parsed.user._id) {
      // Fix it in place
      localStorage.setItem('user', JSON.stringify(parsed.user));
      return parsed.user;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Get authentication headers for API requests
 * @param {object} extraHeaders - Additional headers to merge
 * @returns {object} Headers object
 */
function authHeaders(extraHeaders = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...extraHeaders,
  };
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  return !!(getToken() && getCurrentUser());
}

/**
 * Require authentication - redirect to login if not authenticated
 * @returns {boolean} True if authenticated
 */
function requireAuth() {
  if (!isAuthenticated()) {
    sessionStorage.setItem('redirectMessage', 'Please login to continue');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ============================================
// STRING HELPERS
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  return String(str).replace(/[&<>"'/]/g, s => map[s]);
}

/**
 * Truncate text to a specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
function truncateText(str, length = 100, suffix = '…') {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
}

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, word => 
    word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
  );
}

/**
 * Slugify a string (URL-friendly)
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// DATE HELPERS
// ============================================

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Relative time string
 */
function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'invalid date';
  
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
}

/**
 * Format date for display
 * @param {string|Date} dateStr - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
function formatDate(dateStr, options = {}) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };
  
  return date.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format time for display
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Formatted time
 */
function formatTime(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid time';
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
  });
}

/**
 * Get formatted date and time
 * @param {string|Date} dateStr - Date to format
 * @returns {string} Formatted date and time
 */
function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid date';
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Generate avatar HTML
 * @param {object} user - User object with avatar, name
 * @param {string} size - Size class (sm, lg, etc.)
 * @returns {string} Avatar HTML
 */
function avatarHTML(user, size = '') {
  if (!user) {
    return `<div class="avatar-circle ${size}">?</div>`;
  }
  
  if (user.avatar) {
    return `<div class="avatar-circle ${size}"><img src="${user.avatar}" alt="${escapeHTML(user.name || 'User')}" /></div>`;
  }
  
  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
  return `<div class="avatar-circle ${size}">${initial}</div>`;
}

/**
 * Generate skeleton loading card HTML
 * @param {number} count - Number of skeletons to generate
 * @returns {string} Skeleton HTML
 */
function skeletonCard(count = 1) {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(`
      <div class="skeleton-card">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;">
          <div class="skeleton-circle" style="width:40px;height:40px;flex-shrink:0;"></div>
          <div style="flex:1;">
            <div class="skeleton-line" style="width:40%;"></div>
            <div class="skeleton-line" style="width:25%;margin-bottom:0;"></div>
          </div>
        </div>
        <div class="skeleton-line" style="width:100%;"></div>
        <div class="skeleton-line" style="width:80%;"></div>
        <div class="skeleton-line" style="width:60%;margin-bottom:0;"></div>
      </div>
    `);
  }
  return skeletons.join('');
}

/**
 * Generate skeleton profile header HTML
 * @returns {string} Skeleton HTML
 */
function skeletonProfile() {
  return `
    <div class="skeleton-card" style="padding:0;overflow:hidden;">
      <div class="skeleton" style="height:140px;border-radius:0;"></div>
      <div style="padding:1.5rem;position:relative;">
        <div class="skeleton-circle" style="width:88px;height:88px;margin-top:-50px;border:4px solid var(--card-bg);"></div>
        <div class="skeleton-line" style="width:40%;margin-top:10px;"></div>
        <div class="skeleton-line" style="width:25%;"></div>
        <div class="skeleton-line" style="width:60%;margin-top:8px;"></div>
      </div>
    </div>
  `;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: success, error, warning, info
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'info', duration = APP_CONFIG.maxToastDuration || 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  
  const icons = {
    success: '<i class="fa-solid fa-circle-check" style="color:var(--success);"></i>',
    error: '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation" style="color:var(--warning);"></i>',
    info: '<i class="fa-solid fa-circle-info" style="color:var(--info);"></i>',
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHTML(message)}</span>
    <button class="toast-close" aria-label="Dismiss notification">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;
  
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    });
  }
  
  container.appendChild(toast);
  
  const timeout = setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
  
  toast.dataset.timeout = timeout;
}

// ============================================
// THEME MANAGEMENT
// ============================================

/**
 * Initialize theme from localStorage or system preference
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

/**
 * Update theme icon based on current theme
 * @param {string} theme - 'light' or 'dark'
 */
function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (!icon) return;
  // Font Awesome <i> tag
  if (icon.tagName === 'I') {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    return;
  }
  // Inline SVG
  if (theme === 'dark') {
    icon.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  } else {
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

// ============================================
// IMAGE LIGHTBOX
// ============================================

/**
 * Open image in a lightbox overlay
 * @param {string} src - Image source URL
 */
function openLightbox(src) {
  const existing = document.querySelector('.lightbox');
  if (existing) existing.remove();
  
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Image viewer');
  
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Full size image';
  img.loading = 'lazy';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.setAttribute('aria-label', 'Close image viewer');
  
  box.appendChild(img);
  box.appendChild(closeBtn);
  document.body.appendChild(box);
  
  // Close on click
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target === closeBtn) {
      box.remove();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      box.remove();
      document.removeEventListener('keydown', handler);
    }
  });
}

// ============================================
// DEBOUNCE & THROTTLE
// ============================================

/**
 * Debounce a function call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = APP_CONFIG.searchDebounce) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function call
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(fn, limit = 1000) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
function isValidUsername(username) {
  if (!username) return false;
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and checks
 */
function validatePasswordStrength(password) {
  if (!password) {
    return { score: 0, strong: false, checks: {} };
  }
  
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const strong = score >= 4;
  
  return { score, strong, checks };
}

// ============================================
// BROWSER HELPERS
// ============================================

/**
 * Check if running in a mobile browser
 * @returns {boolean} True if mobile
 */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if running in a touch device
 * @returns {boolean} True if touch device
 */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// DOM HELPERS
// ============================================

/**
 * Scroll element into view smoothly
 * @param {HTMLElement} element - Element to scroll to
 * @param {object} options - Scroll options
 */
function scrollToElement(element, options = {}) {
  if (!element) return;
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    ...options,
  });
}

/**
 * Get element position relative to viewport
 * @param {HTMLElement} element - Element to check
 * @returns {object} Position object
 */
function getElementPosition(element) {
  if (!element) return { top: 0, left: 0 };
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

// Make all utilities available globally
window.API = API;
window.getToken = getToken;
window.getCurrentUser = getCurrentUser;
window.authHeaders = authHeaders;
window.isAuthenticated = isAuthenticated;
window.requireAuth = requireAuth;
window.escapeHTML = escapeHTML;
window.truncateText = truncateText;
window.capitalizeWords = capitalizeWords;
window.slugify = slugify;
window.timeAgo = timeAgo;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.formatDateTime = formatDateTime;
window.avatarHTML = avatarHTML;
window.skeletonCard = skeletonCard;
window.skeletonProfile = skeletonProfile;
window.showToast = showToast;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.updateThemeIcon = updateThemeIcon;
window.openLightbox = openLightbox;
window.debounce = debounce;
window.throttle = throttle;
window.isValidEmail = isValidEmail;
window.isValidUsername = isValidUsername;
window.validatePasswordStrength = validatePasswordStrength;
window.isMobile = isMobile;
window.isTouchDevice = isTouchDevice;
window.copyToClipboard = copyToClipboard;
window.scrollToElement = scrollToElement;
window.getElementPosition = getElementPosition;

// ===== Migrate legacy auth storage on page load =====
(function fixLocalStorage() {
  if (window.AuthStorage) return;
  try {
    const legacyToken = localStorage.getItem('token');
    if (legacyToken && !sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', legacyToken);
    }
    localStorage.removeItem('token');
  } catch { /* ignore */ }
})();

// ============================================
// LOGOUT
// ============================================

// ===== Logout =====
function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include', headers: authHeaders() });
    } catch { /* ignore */ }
    window.AuthStorage?.clear();
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.replace('login.html');
  });
}
window.initLogout = initLogout;

// ============================================
// USER SEARCH (navbar)
// ============================================

function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  let searchTimeout;
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (!q) { results.classList.add('hidden'); return; }
    searchTimeout = setTimeout(() => doSearch(q, results), 300);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.add('hidden');
    }
  });
}

async function doSearch(q, resultsEl) {
  try {
    const res = await fetch(`${API}/users/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (!res.ok) return;
    const users = await res.json();
    resultsEl.innerHTML = '';
    if (!users.length) {
      resultsEl.innerHTML = `<div class="search-item"><span style="color:var(--text-muted);font-size:0.85rem;">No users found</span></div>`;
    } else {
      users.forEach((u) => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `
          ${avatarHTML(u)}
          <div class="search-item-info">
            <div style="font-weight:600;font-size:0.875rem;">${escapeHTML(u.name)}</div>
            <small>@${escapeHTML(u.username)}</small>
          </div>`;
        item.addEventListener('click', () => {
          window.location.href = `profile.html?u=${u.username}`;
        });
        resultsEl.appendChild(item);
      });
    }
    resultsEl.classList.remove('hidden');
  } catch { /* ignore */ }
}
window.initSearch = initSearch;

// ============================================
// ============================================
// NOTIFICATIONS SUBSYSTEM
// ============================================

let notifOpen = false;
let currentNotifFilter = 'all';

function ensureNotifDropdown() {
  let dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'notif-dropdown';
    dropdown.className = 'notif-dropdown hidden';
    dropdown.setAttribute('role', 'dialog');
    dropdown.setAttribute('aria-label', 'Notifications Menu');
    
    dropdown.innerHTML = `
      <div class="notif-drag-handle"></div>
      <div class="notif-header">
        <div class="notif-header-title">
          <i class="fa-solid fa-bell" style="color:var(--primary);"></i>
          <span>Notifications</span>
        </div>
        <button id="mark-all-read-btn" class="notif-mark-read-btn" title="Mark all read">
          <i class="fa-solid fa-check-double"></i> Mark all read
        </button>
      </div>
      <div class="notif-tabs">
        <button class="notif-tab active" data-filter="all">All</button>
        <button class="notif-tab" data-filter="unread">Unread</button>
      </div>
      <div id="notif-list" class="notif-list"></div>
    `;
    
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn && notifBtn.parentNode) {
      notifBtn.parentNode.appendChild(dropdown);
    } else {
      document.body.appendChild(dropdown);
    }
  }

  let backdrop = document.getElementById('notif-backdrop-overlay');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'notif-backdrop-overlay';
    backdrop.className = 'notif-backdrop-overlay hidden';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeNotifDropdown);
  }

  // Setup tab listeners
  const tabs = dropdown.querySelectorAll('.notif-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentNotifFilter = tab.dataset.filter;
      loadNotifications(currentNotifFilter);
    });
  });

  const markBtn = dropdown.querySelector('#mark-all-read-btn');
  if (markBtn) {
    markBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await markAllRead();
    });
  }

  return dropdown;
}

async function loadNotifCount() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  try {
    const res = await fetch(`${API}/notifications/unread-count`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const count = data.count || 0;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch { /* ignore */ }
}

async function loadNotifications(filter = 'all') {
  ensureNotifDropdown();
  const list = document.getElementById('notif-list');
  if (!list) return;
  
  list.innerHTML = `
    <div style="padding:1.5rem;text-align:center;color:var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem;color:var(--primary);margin-bottom:0.5rem;"></i>
      <p style="font-size:0.85rem;font-weight:600;">Loading notifications...</p>
    </div>
  `;
  
  try {
    const res = await fetch(`${API}/notifications`, { headers: authHeaders() });
    if (!res.ok) { 
      list.innerHTML = `<div class="notif-empty"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Failed to load notifications.</div>`; 
      return; 
    }
    const data = await res.json();
    let notifs = Array.isArray(data) ? data : (data.notifications || []);
    
    if (filter === 'unread') {
      notifs = notifs.filter(n => !n.read);
    }
    
    list.innerHTML = '';
    if (!notifs.length) {
      list.innerHTML = `
        <div class="notif-empty">
          <i class="fa-regular fa-bell-slash" style="font-size:2rem;color:var(--text-muted);margin-bottom:0.5rem;display:block;"></i>
          <p style="font-weight:600;color:var(--text);">No ${filter === 'unread' ? 'unread ' : ''}notifications</p>
          <small style="color:var(--text-muted);">You're all caught up!</small>
        </div>
      `;
      return;
    }
    
    notifs.forEach((n) => {
      const item = document.createElement('div');
      item.className = `notif-item ${n.read ? '' : 'unread'}`;
      
      const typeConfig = {
        like:    { text: 'liked your post', icon: 'fa-solid fa-heart', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
        comment: { text: 'commented on your post', icon: 'fa-solid fa-comment', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
        follow:  { text: 'started following you', icon: 'fa-solid fa-user-plus', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        repost:  { text: 'reposted your content', icon: 'fa-solid fa-repeat', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
        mention: { text: 'mentioned you in a post', icon: 'fa-solid fa-at', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
        message: { text: 'sent you a message', icon: 'fa-solid fa-paper-plane', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
      };
      
      const config = typeConfig[n.type] || { text: 'interacted with you', icon: 'fa-solid fa-bell', color: 'var(--primary)', bg: 'var(--primary-light)' };
      
      item.innerHTML = `
        <div class="notif-avatar-container" style="position:relative;flex-shrink:0;">
          ${avatarHTML(n.sender, 'sm')}
          <span class="notif-action-badge" style="background:${config.bg};color:${config.color};">
            <i class="${config.icon}"></i>
          </span>
        </div>
        <div class="notif-text">
          <div style="color:var(--text);font-size:0.875rem;">
            <strong>${escapeHTML(n.sender ? (n.sender.name || n.sender.username) : 'Someone')}</strong> ${config.text}
          </div>
          <div class="notif-time">${timeAgo(n.createdAt)}</div>
        </div>
        ${!n.read ? `<span class="notif-unread-dot" title="Unread"></span>` : ''}
      `;
      
      if (n.post) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          window.location.href = `post.html?id=${n.post._id || n.post}`;
          closeNotifDropdown();
        });
      } else if (n.type === 'follow' && n.sender?.username) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          window.location.href = `profile.html?u=${n.sender.username}`;
          closeNotifDropdown();
        });
      } else if (n.type === 'message' && n.sender?._id) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          window.location.href = `messages.html?with=${n.sender._id}`;
          closeNotifDropdown();
        });
      }
      
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading notifications:', error);
    list.innerHTML = `<div class="notif-empty"><i class="fa-solid fa-circle-exclamation" style="color:var(--danger);"></i> Failed to load notifications.</div>`;
  }
}

async function markAllRead() {
  try {
    await fetch(`${API}/notifications/read-all`, { method: 'PUT', headers: authHeaders() });
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.add('hidden');
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    document.querySelectorAll('.notif-unread-dot').forEach(el => el.remove());
    showToast('All notifications marked as read', 'success');
  } catch { /* ignore */ }
}

function closeNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  const backdrop = document.getElementById('notif-backdrop-overlay');
  if (dropdown) dropdown.classList.add('hidden');
  if (backdrop) backdrop.classList.add('hidden');
  document.body.classList.remove('notif-open-mobile');
  notifOpen = false;
}

function initNotifications() {
  const btn = document.getElementById('notif-btn');
  if (!btn) return;
  
  ensureNotifDropdown();

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    notifOpen = !notifOpen;
    const dropdown = ensureNotifDropdown();
    const backdrop = document.getElementById('notif-backdrop-overlay');
    
    dropdown.classList.toggle('hidden', !notifOpen);
    if (backdrop) backdrop.classList.toggle('hidden', !notifOpen);
    
    if (window.innerWidth <= 576) {
      document.body.classList.toggle('notif-open-mobile', notifOpen);
    }
    
    if (notifOpen) {
      await loadNotifications(currentNotifFilter);
      await markAllRead();
    }
  });

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notif-dropdown');
    if (notifOpen && dropdown && !dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      closeNotifDropdown();
    }
  });

  loadNotifCount();
  setInterval(loadNotifCount, 30000);
}
window.initNotifications = initNotifications;
window.loadNotifCount = loadNotifCount;

// ============================================
// MESSAGE BADGE
// ============================================

async function loadMsgBadge() {
  try {
    const res = await fetch(`${API}/messages/unread-count`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const count = data.count || 0;
    const badge = document.getElementById('msg-badge');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.toggle('hidden', count === 0);
    }
  } catch { /* ignore */ }
}
window.loadMsgBadge = loadMsgBadge;

// ============================================
// DOM READY — init everything
// ============================================

function initAppUtils() {
  // Theme: already applied by inline script, just update icon
  const savedTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(savedTheme);

  // Wire up theme toggle button
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Wire up logout
  initLogout();

  // Wire up search
  initSearch();

  // Wire up notifications
  initNotifications();

  // Load message badge
  if (isAuthenticated()) {
    loadMsgBadge();
    setInterval(loadMsgBadge, 30000);
  }

  // Dynamically ensure animated cookie banner is initialized
  if (!window.ConnectHubCookieBanner) {
    const cbScript = document.createElement('script');
    cbScript.src = 'js/cookie-banner.js';
    cbScript.onload = function() {
      if (window.ConnectHubCookieBanner) {
        window.ConnectHubCookieBanner.init();
      }
    };
    document.body.appendChild(cbScript);
  } else {
    window.ConnectHubCookieBanner.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAppUtils);
} else {
  initAppUtils();
}
