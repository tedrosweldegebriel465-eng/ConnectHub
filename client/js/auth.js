/**
 * ============================================
 * AUTH.JS - Authentication Module
 * Version: 2.1.0
 * Description: Handles registration, login, 
 *              password management, session,
 *              and security features
 * ============================================
 */

// ===== Configuration =====
const API = window.API_BASE_URL || "http://localhost:5000/api";

const AUTH_CONFIG = {
  tokenKey: 'token',
  userKey: 'user',
  refreshTokenKey: 'refreshToken',
  redirectAfterLogin: 'feed.html',
  redirectAfterRegister: 'feed.html',
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// ===== State =====
let loginAttempts = 0;
let lockoutTimer = null;

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', function() {
  initPasswordToggle();
  initRegistrationForm();
  initLoginForm();
  initLogoutHandler();
  initSocialButtons();
  initPasswordReset();
  initSessionManagement();
  initRememberMe();
  initDemoCredentials();
});

// ============================================
// PASSWORD TOGGLE
// ============================================
function initPasswordToggle() {
  const toggleBtns = document.querySelectorAll('.toggle-password');

  // SVG icons
  const eyeOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeClosed = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  toggleBtns.forEach(btn => {
    // Set initial SVG icon
    btn.innerHTML = eyeOpen;

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const wrap = this.closest('.input-icon-wrap');
      const input = wrap ? wrap.querySelector('input[type="password"], input[type="text"]') : null;
      if (!input) return;

      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      this.innerHTML = showing ? eyeOpen : eyeClosed;
      this.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      input.focus();
    });
  });
}

// ============================================
// REGISTRATION
// ============================================
function initRegistrationForm() {
  const form = document.getElementById('register-form');
  if (!form) return;
  
  // Real-time validation
  const fields = {
    name: { validator: validateName, errorId: 'name-error' },
    username: { validator: validateUsername, errorId: 'username-error' },
    email: { validator: validateEmail, errorId: 'email-error' },
    password: { validator: validatePassword, errorId: 'password-error' },
    'confirm-password': { validator: validateConfirmPassword, errorId: 'confirm-error' },
  };
  
  // Add blur validation
  Object.keys(fields).forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('blur', function() {
        validateField(this, fields[id].validator, fields[id].errorId);
      });
      input.addEventListener('input', function() {
        // Clear error on input
        const errorEl = document.getElementById(fields[id].errorId);
        if (errorEl && errorEl.textContent) {
          errorEl.textContent = '';
          errorEl.style.display = 'none';
        }
        // Remove error class
        this.classList.remove('error');
      });
    }
  });
  
  // Password strength checker
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      checkPasswordStrength(this.value);
      
      // Also check confirm password if it has value
      const confirmInput = document.getElementById('confirm-password');
      if (confirmInput && confirmInput.value) {
        validateField(confirmInput, validateConfirmPassword, 'confirm-error');
      }
    });
  }
  
  // Confirm password real-time check
  const confirmInput = document.getElementById('confirm-password');
  const passwordField = document.getElementById('password');
  if (confirmInput && passwordField) {
    confirmInput.addEventListener('input', function() {
      if (this.value) {
        validateField(this, validateConfirmPassword, 'confirm-error');
      }
    });
  }
  
  // Username availability check (debounced)
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    let usernameTimeout;
    usernameInput.addEventListener('input', function() {
      clearTimeout(usernameTimeout);
      const value = this.value.trim();
      if (value.length >= 3) {
        usernameTimeout = setTimeout(() => {
          checkUsernameAvailability(value);
        }, 500);
      }
    });
  }
  
  // Form submission
  form.addEventListener('submit', handleRegistration);
}

async function handleRegistration(e) {
  e.preventDefault();
  
  const form = e.target;
  const btn = document.getElementById('register-btn');
  const loadingBtn = document.getElementById('register-loading');
  const errorMsg = document.getElementById('error-msg');
  const successMsg = document.getElementById('success-msg');
  
  // Clear previous messages
  hideMessages();
  
  // Validate all fields
  const name = document.getElementById('name');
  const username = document.getElementById('username');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm-password');
  const terms = document.getElementById('terms');
  
  const isNameValid = validateField(name, validateName, 'name-error');
  const isUsernameValid = validateField(username, validateUsername, 'username-error');
  const isEmailValid = validateField(email, validateEmail, 'email-error');
  const isPasswordValid = validateField(password, validatePassword, 'password-error');
  const isConfirmValid = validateField(confirm, validateConfirmPassword, 'confirm-error');
  
  // Check terms
  const termsError = validateTerms(terms);
  const termsErrorEl = document.getElementById('terms-error');
  if (termsErrorEl) {
    termsErrorEl.textContent = termsError || '';
    termsErrorEl.style.display = termsError ? 'block' : 'none';
  }
  
  if (!isNameValid || !isUsernameValid || !isEmailValid || 
      !isPasswordValid || !isConfirmValid || termsError) {
    // Scroll to first error
    const firstError = document.querySelector('.field-error:not(:empty)');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = firstError.closest('.form-group')?.querySelector('input, textarea');
      if (input) input.focus();
    }
    // Shake the card
    const card = document.querySelector('.auth-card');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
    return;
  }
  
  // Show loading state
  btn.classList.add('hidden');
  loadingBtn.classList.remove('hidden');
  loadingBtn.querySelector('span').textContent = 'Creating account...';
  
  try {
    const userData = {
      name: name.value.trim(),
      username: username.value.trim().toLowerCase(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
    };
    
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      // Store auth data
      localStorage.setItem(AUTH_CONFIG.tokenKey, response.token);
      localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(response.user || response));
      localStorage.setItem('lastActivity', Date.now().toString());

      showSuccessMessage('Account created successfully! 🎉');
      
      // Track registration
      trackEvent('registration', { method: 'email', username: userData.username });
      
      // Redirect after delay
      setTimeout(() => {
        window.location.href = AUTH_CONFIG.redirectAfterRegister;
      }, 1000);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showErrorMessage(error.message || 'Something went wrong. Please try again.');
    
    // Reset button states
    btn.classList.remove('hidden');
    loadingBtn.classList.add('hidden');
    
    // Shake the card
    const card = document.querySelector('.auth-card');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
  }
}

// ============================================
// USERNAME AVAILABILITY CHECK
// ============================================
async function checkUsernameAvailability(username) {
  const errorEl = document.getElementById('username-error');
  if (!errorEl) return;
  
  try {
    const response = await apiRequest(`/users/check-username?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    });
    
    if (response.exists) {
      errorEl.textContent = 'Username is already taken';
      errorEl.style.display = 'block';
      document.getElementById('username')?.classList.add('error');
    } else {
      errorEl.textContent = 'Username is available ✅';
      errorEl.style.color = 'var(--success)';
      errorEl.style.display = 'block';
      document.getElementById('username')?.classList.remove('error');
      
      // Reset after 2 seconds
      setTimeout(() => {
        if (errorEl.textContent === 'Username is available ✅') {
          errorEl.style.display = 'none';
          errorEl.style.color = '';
        }
      }, 2000);
    }
  } catch (error) {
    // Silently fail - don't block registration
    console.debug('Username check failed:', error);
  }
}

// ============================================
// LOGIN
// ============================================
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  
  // Add validation
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      validateField(this, validateEmail, 'email-error');
    });
    emailInput.addEventListener('input', function() {
      const errorEl = document.getElementById('email-error');
      if (errorEl && errorEl.textContent) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
      this.classList.remove('error');
    });
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('blur', function() {
      validateField(this, validatePassword, 'password-error');
    });
    passwordInput.addEventListener('input', function() {
      const errorEl = document.getElementById('password-error');
      if (errorEl && errorEl.textContent) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
      this.classList.remove('error');
    });
  }
  
  // Enter key support
  form.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const submitBtn = document.getElementById('login-btn');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      }
    }
  });
  
  form.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  
  // Check if locked out
  if (isLockedOut()) {
    showErrorMessage(`Too many failed attempts. Please try again in ${getLockoutTimeRemaining()} minutes.`);
    return;
  }
  
  const btn = document.getElementById('login-btn');
  const loadingBtn = document.getElementById('login-loading');
  
  hideMessages();
  
  // Validate fields
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  
  const isEmailValid = validateField(email, validateEmail, 'email-error');
  const isPasswordValid = validateField(password, validatePassword, 'password-error');
  
  if (!isEmailValid || !isPasswordValid) {
    const card = document.querySelector('.auth-card');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
    return;
  }
  
  // Show loading
  btn.classList.add('hidden');
  loadingBtn.classList.remove('hidden');
  loadingBtn.querySelector('span').textContent = 'Logging in...';
  
  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value.trim().toLowerCase(),
        password: password.value,
      }),
    });
    
    if (response.token) {
      // Reset login attempts on success
      resetLoginAttempts();
      
      // Store auth data
      localStorage.setItem(AUTH_CONFIG.tokenKey, response.token);
      localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(response.user || response));
      localStorage.setItem('lastActivity', Date.now().toString());
      
      // Handle remember me
      handleRememberMe(email.value.trim());
      
      // Show success message
      showSuccessMessage('Welcome back! 👋');
      
      // Track login
      trackEvent('login', { method: 'email' });
      
      setTimeout(() => {
        window.location.href = AUTH_CONFIG.redirectAfterLogin;
      }, 800);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Increment login attempts
    incrementLoginAttempts();
    
    const remaining = AUTH_CONFIG.maxLoginAttempts - loginAttempts;
    let errorMsg = error.message || 'Invalid email or password';
    if (remaining > 0) {
      errorMsg += ` (${remaining} attempts remaining)`;
    }
    
    showErrorMessage(errorMsg);
    
    btn.classList.remove('hidden');
    loadingBtn.classList.add('hidden');
    
    // Shake the card
    const card = document.querySelector('.auth-card');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);
    }
    
    // Highlight the password field
    password.classList.add('error');
    setTimeout(() => password.classList.remove('error'), 2000);
  }
}

// ============================================
// LOGIN ATTEMPTS TRACKING
// ============================================
function incrementLoginAttempts() {
  loginAttempts++;
  if (loginAttempts >= AUTH_CONFIG.maxLoginAttempts) {
    lockoutTimer = Date.now() + AUTH_CONFIG.lockoutDuration;
    localStorage.setItem('lockoutTimer', lockoutTimer.toString());
    showToast(`Too many failed attempts. Locked out for ${AUTH_CONFIG.lockoutDuration / 60000} minutes.`, 'error');
  }
}

function resetLoginAttempts() {
  loginAttempts = 0;
  lockoutTimer = null;
  localStorage.removeItem('lockoutTimer');
}

function isLockedOut() {
  const storedLockout = localStorage.getItem('lockoutTimer');
  if (!storedLockout) return false;
  
  const lockoutTime = parseInt(storedLockout);
  if (Date.now() < lockoutTime) {
    return true;
  } else {
    localStorage.removeItem('lockoutTimer');
    resetLoginAttempts();
    return false;
  }
}

function getLockoutTimeRemaining() {
  const storedLockout = localStorage.getItem('lockoutTimer');
  if (!storedLockout) return 0;
  
  const remaining = Math.ceil((parseInt(storedLockout) - Date.now()) / 60000);
  return Math.max(0, remaining);
}

// ============================================
// REMEMBER ME
// ============================================
function initRememberMe() {
  const rememberMe = document.getElementById('remember-me');
  const savedEmail = localStorage.getItem('rememberedEmail');
  
  if (savedEmail && rememberMe) {
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.value = savedEmail;
    }
    rememberMe.checked = true;
  }
}

function handleRememberMe(email) {
  const rememberMe = document.getElementById('remember-me');
  if (rememberMe && rememberMe.checked) {
    localStorage.setItem('rememberedEmail', email);
  } else {
    localStorage.removeItem('rememberedEmail');
  }
}

// ============================================
// LOGOUT
// ============================================
function initLogoutHandler() {
  const logoutBtns = document.querySelectorAll('#logout-btn, .logout-btn');
  
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogout();
    });
  });
  
  // Keyboard shortcut: Ctrl+Shift+L
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      handleLogout();
    }
  });
}

function handleLogout() {
  localStorage.removeItem(AUTH_CONFIG.tokenKey);
  localStorage.removeItem(AUTH_CONFIG.userKey);
  localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
  localStorage.removeItem('lastActivity');
  sessionStorage.clear();
  window.location.replace('login.html');
}

// ============================================
// SOCIAL BUTTONS
// ============================================
function initSocialButtons() {
  const googleBtn = document.getElementById('google-register') || document.getElementById('google-login');
  const githubBtn = document.getElementById('github-register') || document.getElementById('github-login');
  
  if (googleBtn) {
    googleBtn.addEventListener('click', function() {
      // Track social login attempt
      trackEvent('social_login', { provider: 'google' });
      showToast('Google authentication coming soon! 🚀', 'info');
      // In production: window.location.href = '/api/auth/google';
    });
  }
  
  if (githubBtn) {
    githubBtn.addEventListener('click', function() {
      trackEvent('social_login', { provider: 'github' });
      showToast('GitHub authentication coming soon! 🚀', 'info');
      // In production: window.location.href = '/api/auth/github';
    });
  }
}

// ============================================
// PASSWORD RESET
// ============================================
function initPasswordReset() {
  const resetBtn = document.getElementById('reset-password-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const email = document.getElementById('reset-email')?.value;
      if (!email) {
        showToast('Please enter your email address', 'warning');
        document.getElementById('reset-email')?.focus();
        return;
      }
      handlePasswordReset(email);
    });
  }
  
  const forgotLink = document.getElementById('forgot-password');
  if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
      e.preventDefault();
      const email = document.getElementById('email')?.value;
      
      if (email && email.trim()) {
        // Pre-fill the reset modal
        showToast('Password reset link will be sent to your email', 'info');
        handlePasswordReset(email.trim());
      } else {
        showToast('Please enter your email address first', 'warning');
        document.getElementById('email')?.focus();
      }
    });
  }
}

async function handlePasswordReset(email) {
  try {
    showToast('Sending reset link...', 'info');
    
    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    
    if (response.success) {
      showToast('Password reset link sent to your email! 📧', 'success');
      trackEvent('password_reset', { email });
    } else {
      throw new Error(response.message || 'Password reset failed');
    }
  } catch (error) {
    console.error('Password reset error:', error);
    showToast(error.message || 'Something went wrong', 'error');
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================
function initSessionManagement() {
  // Check session on page load
  checkSession();
  
  // Activity tracking
  const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, updateLastActivity);
  });
}

function checkSession() {
  const lastActivity = localStorage.getItem('lastActivity');
  if (!lastActivity) return;
  
  const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
  if (timeSinceLastActivity > AUTH_CONFIG.sessionTimeout) {
    // Session expired
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.userKey);
    localStorage.removeItem('lastActivity');
    
    showToast('Session expired. Please login again.', 'warning');
    
    // Redirect to login after delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  }
}

function updateLastActivity() {
  if (isAuthenticated()) {
    localStorage.setItem('lastActivity', Date.now().toString());
  }
}

// ============================================
// DEMO CREDENTIALS (Development only)
// ============================================
function initDemoCredentials() {
  // Only show in development
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }
  
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;
  
  // Add demo credentials helper
  const demoHelper = document.createElement('div');
  demoHelper.className = 'demo-credentials';
  demoHelper.innerHTML = `
    <small style="display:block;font-weight:600;margin-bottom:4px;">🔑 Demo Credentials</small>
    <div class="credential-row">
      <code>demo@example.com</code>
      <code>demo123</code>
    </div>
  `;
  
  // Insert after form
  loginForm.parentNode.insertBefore(demoHelper, loginForm.nextSibling);
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateName(value) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return 'Full name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 50) return 'Name must be less than 50 characters';
  if (/[<>{}]/.test(trimmed)) return 'Name contains invalid characters';
  if (/[0-9]/.test(trimmed)) return 'Name cannot contain numbers';
  return null;
}

function validateUsername(value) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return 'Username is required';
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 20) return 'Username must be less than 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  if (/^[0-9]/.test(trimmed)) return 'Username cannot start with a number';
  if (trimmed.includes('__')) return 'Username cannot contain consecutive underscores';
  return null;
}

function validateEmail(value) {
  const trimmed = value?.trim() || '';
  if (!trimmed) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
  if (trimmed.length > 100) return 'Email must be less than 100 characters';
  // Check for common disposable email domains
  const disposableDomains = ['tempmail.com', 'throwaway.com', 'guerrillamail.com'];
  const domain = trimmed.split('@')[1];
  if (domain && disposableDomains.includes(domain)) {
    return 'Please use a valid email address';
  }
  return null;
}

function validatePassword(value) {
  if (!value || value.length === 0) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  if (value.length > 100) return 'Password must be less than 100 characters';
  return null;
}

function validateConfirmPassword(value) {
  const password = document.getElementById('password')?.value || '';
  if (!value || value.length === 0) return 'Please confirm your password';
  if (value !== password) return 'Passwords do not match';
  return null;
}

function validateTerms(checkbox) {
  if (!checkbox || !checkbox.checked) {
    return 'Please agree to the Terms of Service and Privacy Policy';
  }
  return null;
}

function validateField(input, validator, errorId) {
  const error = validator(input?.value);
  const errorEl = document.getElementById(errorId);
  
  if (errorEl) {
    errorEl.textContent = error || '';
    errorEl.style.display = error ? 'block' : 'none';
    if (error) {
      errorEl.style.color = 'var(--danger)';
    }
  }
  
  // Add/remove error class
  if (input) {
    input.classList.toggle('error', !!error);
  }
  
  return !error;
}

// ============================================
// PASSWORD STRENGTH
// ============================================

function checkPasswordStrength(password) {
  const strengthProgress = document.getElementById('strength-progress');
  const strengthText = document.getElementById('strength-text');
  
  if (!strengthProgress || !strengthText) return;
  
  if (!password) {
    strengthProgress.className = 'strength-progress';
    strengthProgress.style.width = '0%';
    strengthText.textContent = 'Enter a password';
    strengthText.className = 'strength-text';
    return;
  }
  
  const checks = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  
  // Update requirement list
  const reqMap = {
    length: 'req-length',
    upper: 'req-upper',
    lower: 'req-lower',
    number: 'req-number',
    special: 'req-special',
  };
  
  Object.keys(reqMap).forEach(key => {
    const el = document.getElementById(reqMap[key]);
    if (el) {
      const icon = el.querySelector('i');
      const isMet = checks[key];
      el.className = isMet ? 'met' : 'unmet';
      if (icon) {
        icon.className = isMet ? 'fas fa-check-circle' : 'fas fa-circle';
      }
    }
  });
  
  // Calculate strength
  const score = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  let label = 'Weak password';
  
  if (score === 5) {
    strength = 'strong';
    label = 'Strong password! 💪';
  } else if (score === 4) {
    strength = 'good';
    label = 'Good password!';
  } else if (score === 3) {
    strength = 'fair';
    label = 'Fair password';
  } else {
    strength = 'weak';
    label = 'Weak password';
  }
  
  // Update UI
  strengthProgress.className = `strength-progress ${strength}`;
  strengthProgress.style.width = `${(score / 5) * 100}%`;
  strengthText.textContent = label;
  strengthText.className = `strength-text ${strength}`;
  
  return { score, strength, checks };
}

// ============================================
// UI HELPERS
// ============================================

function showErrorMessage(message) {
  const el = document.getElementById('error-msg');
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
    el.setAttribute('role', 'alert');
    el.style.display = 'block';
  }
  // Also show as toast
  showToast(message, 'error');
}

function showSuccessMessage(message) {
  const el = document.getElementById('success-msg');
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
    el.setAttribute('role', 'status');
    el.style.display = 'block';
  }
  showToast(message, 'success');
}

function hideMessages() {
  const errorEl = document.getElementById('error-msg');
  const successEl = document.getElementById('success-msg');
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.style.display = 'none';
  }
  if (successEl) {
    successEl.classList.add('hidden');
    successEl.style.display = 'none';
  }
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    // Create container if it doesn't exist
    const newContainer = document.createElement('div');
    newContainer.id = 'toast-container';
    document.body.appendChild(newContainer);
    return showToast(message, type, duration);
  }
  
  const toast = document.createElement('div');
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle',
  };
  
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${iconMap[type] || iconMap.info}"></i>
    <span>${message}</span>
    <button class="toast-close" aria-label="Dismiss notification">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Add close button functionality
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      toast.remove();
    });
  }
  
  container.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ============================================
// API REQUEST HELPER
// ============================================

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
  const baseUrl = API;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // For cookies
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401 && token) {
        // Try to refresh token
        try {
          const refreshResponse = await refreshToken();
          if (refreshResponse) {
            // Retry the original request with new token
            return apiRequest(endpoint, options);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem(AUTH_CONFIG.tokenKey);
          localStorage.removeItem(AUTH_CONFIG.userKey);
          window.location.href = 'login.html';
          throw new Error('Session expired. Please login again.');
        }
      }
      
      throw new Error(data.message || data.error || `Request failed: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ============================================
// TOKEN REFRESH
// ============================================
async function refreshToken() {
  const refreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await fetch(`${API}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      localStorage.setItem(AUTH_CONFIG.tokenKey, data.token);
      if (data.refreshToken) {
        localStorage.setItem(AUTH_CONFIG.refreshTokenKey, data.refreshToken);
      }
      return data.token;
    }
    
    throw new Error('Refresh failed');
  } catch (error) {
    throw error;
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function isAuthenticated() {
  const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
  const user = localStorage.getItem(AUTH_CONFIG.userKey);
  return !!(token && user);
}

function getCurrentUser() {
  try {
    const user = localStorage.getItem(AUTH_CONFIG.userKey);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem(AUTH_CONFIG.tokenKey);
}

// ============================================
// ANALYTICS / TRACKING
// ============================================

function trackEvent(eventName, data = {}) {
  // Simple console tracking in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 [${eventName}]`, data);
  }
  
  // In production, you'd send to analytics service
  // Example: gtag('event', eventName, data);
  // Example: mixpanel.track(eventName, data);
}

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.auth = {
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  logout: handleLogout,
  apiRequest,
  showToast,
  trackEvent,
  refreshToken,
};

console.log('🔐 Auth module initialized successfully');
console.log(`📍 API Endpoint: ${API}`);
console.log(`👤 Authenticated: ${isAuthenticated()}`);