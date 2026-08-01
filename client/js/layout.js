/**
 * ============================================
 * LAYOUT.JS - Shared Layout Module
 * Version: 2.0.0
 * Description: Manages shared UI components like
 *              navbar, footer, and notifications
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================

const APP_CONFIG = {
  name: '⚡ ConnectHub',
  tagline: 'Connect, Share, and Discover Short Vertical Videos & Real-Time Socializing',
  version: '2.0.0',
  year: new Date().getFullYear(),
  socialLinks: {
    twitter: 'https://twitter.com/connecthub',
    facebook: 'https://facebook.com/connecthub',
    instagram: 'https://instagram.com/connecthub',
    github: 'https://github.com/connecthub',
  },
  navItems: [
    { id: 'feed', label: 'Feed', icon: 'home', href: 'feed.html' },
    { id: 'clips', label: 'Clips ⚡', icon: 'video', href: 'clips.html' },
    { id: 'explore', label: 'Explore', icon: 'compass', href: 'explore.html' },
    { id: 'messages', label: 'Messages', icon: 'envelope', href: 'messages.html' },
    { id: 'bookmarks', label: 'Saved', icon: 'bookmark', href: 'bookmarks.html' },
    { id: 'profile', label: 'Profile', icon: 'user', href: 'profile.html' },
  ],
};

// ============================================
// COMPONENT RENDERERS
// ============================================

/**
 * Renders the navigation bar
 * @param {string} activePage - Active page identifier
 * @param {object} options - Optional settings
 * @returns {string} HTML string
 */
function renderNavbar(activePage, options = {}) {
  const { showSearch = true, showTheme = true, showLogout = true } = options;
  
  return `
    <nav class="navbar" role="navigation" aria-label="Main navigation">
      <!-- Logo -->
      <a href="feed.html" class="nav-logo" aria-label="Home">
        ${getIcon('logoText', { size: 26 })}
        <span>${APP_CONFIG.name}</span>
      </a>
      
      <!-- Search -->
      ${showSearch ? `
        <div class="nav-search" role="search">
          <span class="search-icon">${getIcon('search', { size: 16 })}</span>
          <input 
            type="text" 
            id="search-input" 
            placeholder="Search people..." 
            autocomplete="off"
            aria-label="Search people"
            aria-describedby="search-results"
          />
          <div id="search-results" class="search-dropdown hidden" role="listbox"></div>
        </div>
      ` : ''}
      
      <!-- Nav Actions -->
      <div class="nav-actions">
        ${APP_CONFIG.navItems.map(item => `
          <a 
            href="${item.href}" 
            class="nav-icon-btn ${activePage === item.id ? 'active' : ''}" 
            title="${item.label}"
            aria-label="${item.label}"
            ${item.id === 'profile' ? 'id="profile-link"' : ''}
          >
            ${getIcon(item.icon, { size: 20 })}
            ${item.id === 'messages' ? `<span class="msg-badge hidden" id="msg-badge"></span>` : ''}
          </a>
        `).join('')}
        
        <!-- Notifications -->
        <button 
          class="nav-icon-btn" 
          id="notif-btn" 
          title="Notifications" 
          aria-label="Notifications"
          style="position:relative;"
        >
          ${getIcon('bell', { size: 20 })}
          <span class="notif-badge hidden" id="notif-badge"></span>
        </button>
        
        <!-- Theme Toggle -->
        ${showTheme ? `
          <button 
            class="nav-icon-btn theme-btn" 
            id="theme-btn" 
            title="Toggle dark mode" 
            aria-label="Toggle theme"
          >
            ${getIcon('moon', { size: 20, id: 'theme-icon' })}
          </button>
        ` : ''}
        
        <!-- Logout -->
        ${showLogout ? `
          <button 
            class="nav-icon-btn logout-btn" 
            id="logout-btn" 
            title="Logout" 
            aria-label="Logout"
          >
            ${getIcon('logout', { size: 18 })}
          </button>
        ` : ''}
      </div>
    </nav>
  `;
}

/**
 * Renders the notifications dropdown panel
 * @returns {string} HTML string
 */
function renderNotificationPanel() {
  return `
    <div id="notif-dropdown" class="notif-dropdown hidden" role="dialog" aria-label="Notifications Menu">
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
    </div>
  `;
}

/**
 * Renders the footer
 * @param {object} options - Optional settings
 * @returns {string} HTML string
 */
function renderFooter(options = {}) {
  const { showSocial = true, showLinks = true } = options;
  
  return `
    <footer class="site-footer" role="contentinfo">
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="feed.html" class="footer-logo">
            ${getIcon('logoText', { size: 24 })}
            <span>${APP_CONFIG.name}</span>
          </a>
          <p class="footer-tagline">${APP_CONFIG.tagline}</p>
        </div>
        
        ${showLinks ? `
          <div class="footer-links">
            <a href="about.html">About</a>
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
            <a href="help.html">Help</a>
          </div>
        ` : ''}
        
        ${showSocial ? `
          <div class="footer-social">
            <a href="${APP_CONFIG.socialLinks.twitter}" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="${APP_CONFIG.socialLinks.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i class="fab fa-facebook"></i>
            </a>
            <a href="${APP_CONFIG.socialLinks.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i class="fab fa-instagram"></i>
            </a>
            <a href="${APP_CONFIG.socialLinks.github}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <i class="fab fa-github"></i>
            </a>
          </div>
        ` : ''}
      </div>
      
      <div class="footer-bottom">
        <span>&copy; ${APP_CONFIG.year} ${APP_CONFIG.name}. All rights reserved.</span>
        <span class="footer-version">v${APP_CONFIG.version}</span>
      </div>
    </footer>
  `;
}

/**
 * Renders authentication branding (login/register pages)
 * @returns {string} HTML string
 */
function renderAuthBrand() {
  return `
    <a href="index.html" class="auth-logo" aria-label="Home">
      ${getIcon('logoText', { size: 32 })}
      <span>${APP_CONFIG.name}</span>
    </a>
  `;
}

/**
 * Renders page header
 * @param {string} title - Page title
 * @param {string} subtitle - Page subtitle
 * @param {string} icon - Icon name
 * @returns {string} HTML string
 */
function renderPageHeader(title, subtitle = '', icon = '') {
  return `
    <div class="page-header">
      <h1>
        ${icon ? `<i class="fas fa-${icon}"></i>` : ''}
        ${title}
      </h1>
      ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
    </div>
  `;
}

/**
 * Renders breadcrumb navigation
 * @param {Array} items - Breadcrumb items [{label, href}]
 * @returns {string} HTML string
 */
function renderBreadcrumb(items) {
  return `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="feed.html"><i class="fas fa-home"></i></a></li>
        ${items.map((item, index) => `
          <li>
            ${index < items.length - 1 
              ? `<a href="${item.href}">${item.label}</a>` 
              : `<span>${item.label}</span>`
            }
          </li>
        `).join('')}
      </ol>
    </nav>
  `;
}

/**
 * Renders a loading spinner
 * @param {string} text - Loading text
 * @returns {string} HTML string
 */
function renderLoadingSpinner(text = 'Loading...') {
  return `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>${text}</span>
    </div>
  `;
}

// ============================================
// MOUNT FUNCTIONS
// ============================================

/**
 * Mount the full layout (navbar, notification panel, footer)
 * @param {string} activePage - Active page identifier
 * @param {object} options - Mount options
 */
function mountLayout(activePage, options = {}) {
  const {
    footer = true,
    showSearch = true,
    showTheme = true,
    showLogout = true,
    showSocial = true,
    showLinks = true,
    container = document,
  } = options;
  
  // Mount navbar
  const navEl = container.getElementById('site-nav') || container.querySelector('#site-nav');
  if (navEl) {
    navEl.innerHTML = renderNavbar(activePage, { showSearch, showTheme, showLogout });
  }
  
  // Mount notification panel
  const notifEl = container.getElementById('notif-panel') || container.querySelector('#notif-panel');
  if (notifEl) {
    notifEl.innerHTML = renderNotificationPanel();
  }
  
  // Mount footer
  if (footer) {
    const footerEl = container.getElementById('site-footer') || container.querySelector('#site-footer');
    if (footerEl) {
      footerEl.innerHTML = renderFooter({ showSocial, showLinks });
    }
  }
  
  // Initialize layout features
  initLayoutFeatures();
}

/**
 * Mount authentication branding
 * @param {HTMLElement|string} container - Container element or selector
 */
function mountAuthBrand(container) {
  const el = typeof container === 'string' 
    ? document.querySelector(container) 
    : container;
  
  if (el) {
    el.innerHTML = renderAuthBrand();
  }
}

/**
 * Initialize layout features (theme toggle, logout, search)
 */
function initLayoutFeatures() {
  // Theme toggle is handled by theme.js
  // Logout is handled by auth.js
  // Search is handled by feed.js or dedicated search module
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the current user from localStorage
 * @returns {object|null} User object or null
 */
function getCurrentUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
  if (window.AuthStorage?.isAuthenticated()) return true;
  return !!(sessionStorage.getItem('token') && localStorage.getItem('user'));
}

/**
 * Update notification badge count
 * @param {number} count - Number of unread notifications
 */
function updateNotificationBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

/**
 * Update message badge count
 * @param {number} count - Number of unread messages
 */
function updateMessageBadge(count) {
  const badge = document.getElementById('msg-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// ============================================
// PAGE SPECIFIC LAYOUT HELPERS
// ============================================

/**
 * Get page title based on current page
 * @param {string} page - Page identifier
 * @returns {string} Page title
 */
function getPageTitle(page) {
  const titles = {
    feed: 'Feed',
    explore: 'Explore',
    messages: 'Messages',
    bookmarks: 'Saved Posts',
    profile: 'Profile',
    post: 'Post',
    login: 'Login',
    register: 'Sign Up',
    index: 'Home',
  };
  return titles[page] || APP_CONFIG.name;
}

/**
 * Get page description based on current page
 * @param {string} page - Page identifier
 * @returns {string} Page description
 */
function getPageDescription(page) {
  const descriptions = {
    feed: 'Your personalized feed of posts and updates',
    explore: 'Discover trending content and new connections',
    messages: 'Your private messages and conversations',
    bookmarks: 'All your saved posts in one place',
    profile: 'Your profile and activity',
    post: 'View post and comments',
    login: 'Login to your account',
    register: 'Create a new account',
    index: 'Connect with friends and share moments',
  };
  return descriptions[page] || APP_CONFIG.tagline;
}

/**
 * Update page metadata (title, description)
 * @param {string} page - Page identifier
 */
function updatePageMetadata(page) {
  const title = getPageTitle(page);
  const description = getPageDescription(page);
  
  document.title = `${title} – ${APP_CONFIG.name}`;
  
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = description;
  }
  
  // Update Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.content = `${title} – ${APP_CONFIG.name}`;
  }
  
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.content = description;
  }
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.AppConfig = APP_CONFIG;
window.Layout = {
  renderNavbar,
  renderNotificationPanel,
  renderFooter,
  renderAuthBrand,
  renderPageHeader,
  renderBreadcrumb,
  renderLoadingSpinner,
  mountLayout,
  mountAuthBrand,
  initLayoutFeatures,
  getCurrentUser,
  isAuthenticated,
  updateNotificationBadge,
  updateMessageBadge,
  getPageTitle,
  getPageDescription,
  updatePageMetadata,
};

console.log('🏗️ Layout module initialized');

// ============================================
// AUTO-INJECT HEAD LINKS
// ============================================

(function autoInjectHeadLinks() {
  if (document.querySelector('[data-head-injected]')) return;
  
  const links = `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%234f46e5'/%3E%3Ccircle cx='16' cy='16' r='6' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E" />
    <link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%234f46e5'/%3E%3Ccircle cx='16' cy='16' r='6' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E" />
    <meta name="theme-color" content="#4f46e5" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  `;
  
  const marker = document.createElement('meta');
  marker.setAttribute('data-head-injected', 'true');
  document.head.appendChild(marker);
  document.head.insertAdjacentHTML('beforeend', links);
})();