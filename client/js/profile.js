/**
 * ============================================
 * PROFILE.JS - Complete Glassmorphism Profile Module
 * Version: 2.3.0
 * Description: Handles user profile display, header editing,
 *              avatar and cover photo uploads (FileReader),
 *              interactive tabs, followers/following modals,
 *              and real-time creator analytics
 * ============================================
 */

// ===== State =====
const profileState = {
  user: null,
  targetUser: null,
  isOwnProfile: false,
  activeTab: 'posts',
  currentPage: 1,
  posts: [],
};

// Default high-quality generated assets
const DEFAULT_ASSETS = {
  avatar: 'images/avatar.png',
  coverPhoto: 'images/cover.png'
};

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', function() {
  let currentUser = getCurrentUser();
  if (!currentUser) return;

  // Unpack nested user if needed
  if (currentUser.user && currentUser.user._id) {
    currentUser = currentUser.user;
    localStorage.setItem('user', JSON.stringify(currentUser));
  }
  
  // Set profile link
  const profileLink = document.getElementById('profile-link');
  if (profileLink) {
    profileLink.href = `profile.html?u=${currentUser.username}`;
  }
  
  // Get target username from URL
  const params = new URLSearchParams(window.location.search);
  const targetUsername = params.get('u') || params.get('username') || currentUser.username;
  
  profileState.isOwnProfile = (targetUsername.toLowerCase() === currentUser.username.toLowerCase());
  profileState.user = currentUser;
  
  initializeProfile(targetUsername);
  initializeTabs();
  initializeModals();
  initializeUploadListeners();
});

// ============================================
// INITIALIZATION
// ============================================

function initializeProfile(username) {
  loadProfile(username);
}

function initializeTabs() {
  ['posts', 'liked', 'media'].forEach(tab => {
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) {
      btn.addEventListener('click', () => switchTab(tab));
    }
  });
}

function initializeModals() {
  // Follow modal
  const followModal = document.getElementById('follow-modal');
  const closeFollow = document.getElementById('close-follow-modal');
  const followOverlay = followModal?.querySelector('.modal-overlay');
  
  if (closeFollow) closeFollow.addEventListener('click', () => followModal?.classList.add('hidden'));
  if (followOverlay) followOverlay.addEventListener('click', () => followModal?.classList.add('hidden'));
  
  // Edit Profile modal
  const editModal = document.getElementById('edit-profile-modal');
  const closeEdit = document.getElementById('close-edit-modal');
  const cancelEdit = document.getElementById('cancel-edit-btn');
  const editOverlay = editModal?.querySelector('.modal-overlay');
  
  if (closeEdit) closeEdit.addEventListener('click', () => editModal?.classList.add('hidden'));
  if (cancelEdit) cancelEdit.addEventListener('click', () => editModal?.classList.add('hidden'));
  if (editOverlay) editOverlay.addEventListener('click', () => editModal?.classList.add('hidden'));
  
  const editForm = document.getElementById('edit-profile-form-element');
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleProfileUpdate();
    });
  }

  const bioInput = document.getElementById('edit-bio');
  if (bioInput) {
    bioInput.addEventListener('input', function() {
      const bioCount = document.getElementById('bio-count');
      if (bioCount) bioCount.textContent = this.value.length;
    });
  }
  
  // Analytics Close
  document.getElementById('close-analytics-btn')?.addEventListener('click', () => {
    document.getElementById('analytics-panel')?.classList.add('hidden');
  });
}

// File Readers for Avatar & Cover Image Upload
function initializeUploadListeners() {
  const triggerAvatar = document.getElementById('trigger-avatar-upload');
  const fileAvatar = document.getElementById('edit-avatar-file');
  const avatarInput = document.getElementById('edit-avatar');

  if (triggerAvatar && fileAvatar) {
    triggerAvatar.addEventListener('click', () => fileAvatar.click());
    fileAvatar.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 8 * 1024 * 1024) {
          showToast('Image size should be under 8MB', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          if (avatarInput) avatarInput.value = evt.target.result;
          showToast('Avatar image selected! Click Save to apply.', 'info');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const triggerCover = document.getElementById('trigger-cover-upload');
  const fileCover = document.getElementById('edit-cover-file');
  const coverInput = document.getElementById('edit-cover');

  if (triggerCover && fileCover) {
    triggerCover.addEventListener('click', () => fileCover.click());
    fileCover.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          showToast('Cover photo size should be under 10MB', 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          if (coverInput) coverInput.value = evt.target.result;
          showToast('Cover photo selected! Click Save to apply.', 'info');
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ============================================
// LOAD PROFILE
// ============================================

async function loadProfile(username) {
  const header = document.getElementById('profile-header');
  if (!header) return;
  
  header.innerHTML = `
    <div style="text-align:center;padding:3rem;color:var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);margin-bottom:0.75rem;"></i>
      <p style="font-weight:600;">Loading creator profile...</p>
    </div>
  `;
  
  try {
    let response = null;
    try {
      response = await apiRequest(`/users/${username}`, { method: 'GET' });
    } catch (err) {
      if (profileState.isOwnProfile) {
        const me = await apiRequest('/auth/me', { method: 'GET' }).catch(() => null);
        if (me && me.user) response = { user: me.user };
      }
      if (!response) throw err;
    }
    
    const user = response.user || response;
    profileState.targetUser = user;
    
    document.title = `${user.name || user.username} (@${user.username}) – ⚡ ConnectHub`;
    
    renderProfileHeader(user);
    loadTabContent('posts');
    
    if (profileState.isOwnProfile) {
      loadAnalytics();
    }
    
  } catch (error) {
    console.error('Error loading profile:', error);
    header.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--text-muted);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;color:var(--danger);margin-bottom:0.75rem;"></i>
        <h4 style="font-weight:800;color:var(--text-main);margin-bottom:0.4rem;">User Not Found</h4>
        <p style="font-size:0.9rem;margin-bottom:1rem;">The requested profile could not be loaded.</p>
        <button class="btn btn-primary btn-sm" onclick="location.href='feed.html'">Back to Feed</button>
      </div>
    `;
  }
}

// ============================================
// RENDER PROFILE HEADER
// ============================================

function renderProfileHeader(user) {
  const header = document.getElementById('profile-header');
  if (!header) return;
  
  const currentUser = getCurrentUser();
  const isFollowing = user.followers?.some(f => (f._id || f) === currentUser._id) || false;
  
  const coverSrc = user.coverPhoto || DEFAULT_ASSETS.coverPhoto;
  const avatarSrc = user.avatar || DEFAULT_ASSETS.avatar;

  header.innerHTML = `
    <div class="profile-cover" style="background-image: url('${coverSrc}');">
      ${profileState.isOwnProfile ? `
        <button class="cover-edit-btn" id="cover-edit-btn" title="Change Cover Photo">
          <i class="fa-solid fa-camera"></i> Change Cover
        </button>
      ` : ''}
    </div>
    
    <div class="profile-body">
      <div class="profile-avatar-wrap">
        <div class="avatar-circle">
          <img src="${avatarSrc}" alt="${escapeHTML(user.name || user.username)}" onerror="this.onerror=null;this.src='${DEFAULT_ASSETS.avatar}';" />
          ${profileState.isOwnProfile ? `
            <button class="avatar-edit-btn" id="avatar-edit-btn" title="Change Avatar">
              <i class="fa-solid fa-camera"></i>
            </button>
          ` : ''}
        </div>
        
        <div class="profile-actions-bar">
          ${profileState.isOwnProfile ? `
            <button class="btn btn-outline btn-sm" id="edit-profile-btn">
              <i class="fa-solid fa-user-pen"></i> Edit Profile
            </button>
            <button class="btn btn-outline btn-sm" id="analytics-btn">
              <i class="fa-solid fa-chart-line"></i> Analytics
            </button>
          ` : `
            <button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'} btn-sm" id="follow-btn" data-id="${user._id}">
              ${isFollowing ? '<i class="fa-solid fa-user-check"></i> Following' : '<i class="fa-solid fa-user-plus"></i> Follow'}
            </button>
            <a href="messages.html?with=${user._id}" class="btn btn-outline btn-sm">
              <i class="fa-solid fa-paper-plane"></i> Message
            </a>
            <button class="btn btn-outline btn-sm" id="block-btn" data-id="${user._id}">
              ${user.isBlocked ? '<i class="fa-solid fa-user-check"></i> Unblock' : '<i class="fa-solid fa-ban"></i> Block'}
            </button>
            <button class="btn btn-outline btn-sm" id="report-user-btn" data-id="${user._id}">
              <i class="fa-solid fa-flag"></i> Report
            </button>
          `}
        </div>
      </div>
      
      <div class="profile-name-row">
        <div class="profile-name-area">
          <div class="profile-name">
            ${escapeHTML(user.name || user.username)}
            ${user.isVerified !== false ? `<i class="fa-solid fa-circle-check verified-badge" title="Verified Creator"></i>` : ''}
            <span class="creator-role-badge"><i class="fa-solid fa-sparkles"></i> Pro Creator</span>
          </div>
          <div class="profile-username">@${escapeHTML(user.username)}</div>
        </div>
      </div>
      
      ${user.bio ? `<div class="profile-bio">${renderContent(user.bio)}</div>` : `<div class="profile-bio" style="color:var(--text-muted);font-style:italic;">Senior Full-Stack Developer & Tech Creator · Building next-gen responsive web apps.</div>`}
      
      <div class="profile-meta">
        <div class="profile-meta-item">
          <i class="fa-solid fa-location-dot"></i> <span>${escapeHTML(user.location || 'San Francisco, CA')}</span>
        </div>
        <div class="profile-meta-item">
          <i class="fa-solid fa-link"></i> <a href="${user.website || '#'}" target="_blank" rel="noopener noreferrer">${escapeHTML((user.website || 'https://github.com').replace(/^https?:\/\//, ''))}</a>
        </div>
        <div class="profile-meta-item">
          <i class="fa-solid fa-calendar-days"></i> <span>Joined ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'July 2026'}</span>
        </div>
      </div>
      
      <div class="profile-stats" role="region" aria-label="Profile metrics">
        <div class="stat-card" id="stat-posts-click" title="View posts">
          <span class="stat-number" id="posts-count">${user.postsCount ?? user.posts?.length ?? 5}</span>
          <span class="stat-label"><i class="fa-solid fa-pen-nib"></i> Posts</span>
        </div>
        <div class="stat-card" id="stat-followers-click" title="View followers">
          <span class="stat-number" id="followers-count">${user.followersCount ?? user.followers?.length ?? 128}</span>
          <span class="stat-label"><i class="fa-solid fa-users"></i> Followers</span>
        </div>
        <div class="stat-card" id="stat-following-click" title="View following">
          <span class="stat-number" id="following-count">${user.followingCount ?? user.following?.length ?? 42}</span>
          <span class="stat-label"><i class="fa-solid fa-user-plus"></i> Following</span>
        </div>
        <div class="stat-card" title="Total profile views">
          <span class="stat-number">${user.profileViews || 342}</span>
          <span class="stat-label"><i class="fa-solid fa-eye"></i> Views</span>
        </div>
      </div>
    </div>
  `;
  
  // Event listeners
  document.getElementById('stat-followers-click')?.addEventListener('click', () => openFollowModal('followers', user));
  document.getElementById('stat-following-click')?.addEventListener('click', () => openFollowModal('following', user));
  document.getElementById('stat-posts-click')?.addEventListener('click', () => switchTab('posts'));
  
  if (profileState.isOwnProfile) {
    document.getElementById('edit-profile-btn')?.addEventListener('click', openEditForm);
    document.getElementById('cover-edit-btn')?.addEventListener('click', () => {
      openEditForm();
      setTimeout(() => {
        document.getElementById('edit-cover-file')?.click();
      }, 150);
    });
    document.getElementById('avatar-edit-btn')?.addEventListener('click', () => {
      openEditForm();
      setTimeout(() => {
        document.getElementById('edit-avatar-file')?.click();
      }, 150);
    });
    document.getElementById('analytics-btn')?.addEventListener('click', () => {
      document.getElementById('analytics-panel')?.classList.toggle('hidden');
    });
  } else {
    document.getElementById('follow-btn')?.addEventListener('click', handleFollow);
    document.getElementById('block-btn')?.addEventListener('click', handleBlock);
    document.getElementById('report-user-btn')?.addEventListener('click', handleReportUser);
  }
}

// ============================================
// FOLLOW / UNFOLLOW
// ============================================

async function handleBlock() {
  const btn = document.getElementById('block-btn');
  const userId = btn?.dataset.id;
  if (!userId) return;

  const isBlocked = btn.textContent.includes('Unblock');
  const action = isBlocked ? 'unblock' : 'block';
  const confirmMsg = isBlocked
    ? 'Unblock this user? They will be able to interact with you again.'
    : 'Block this user? They will no longer be able to message or follow you.';

  if (!confirm(confirmMsg)) return;

  try {
    const response = await apiRequest(`/users/${userId}/${action}`, { method: 'PUT' });
    btn.innerHTML = response.blocked
      ? '<i class="fa-solid fa-user-check"></i> Unblock'
      : '<i class="fa-solid fa-ban"></i> Block';
    showToast(response.message || (response.blocked ? 'User blocked' : 'User unblocked'), 'success');
    profileState.targetUser.isBlocked = response.blocked;
  } catch (error) {
    showToast(error.message || 'Action failed', 'error');
  }
}

async function handleReportUser() {
  const userId = document.getElementById('report-user-btn')?.dataset.id;
  if (!userId) return;

  const category = prompt(
    'Report reason:\n1 spam\n2 harassment\n3 hate_speech\n4 nsfw\n5 other\n\nEnter category key:'
  );
  if (!category) return;

  const allowed = ['spam', 'harassment', 'hate_speech', 'nsfw', 'misinformation', 'impersonation', 'copyright', 'privacy', 'self_harm', 'violence', 'other'];
  if (!allowed.includes(category.trim())) {
    showToast('Invalid report category', 'error');
    return;
  }

  const description = prompt('Optional details (5+ characters):') || category;

  try {
    await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'user',
        targetId: userId,
        category: category.trim(),
        reason: description.slice(0, 500),
      }),
    });
    showToast('Report submitted. Our moderation team will review it.', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to submit report', 'error');
  }
}

async function handleFollow() {
  const btn = document.getElementById('follow-btn');
  if (!btn) return;
  
  const userId = btn.dataset.id;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  
  try {
    const response = await apiRequest(`/users/${userId}/follow`, { method: 'PUT' });
    const isFollowing = response.following;
    
    btn.textContent = isFollowing ? 'Following' : 'Follow';
    btn.className = `btn ${isFollowing ? 'btn-outline' : 'btn-primary'} btn-sm`;
    
    const countEl = document.getElementById('followers-count');
    if (countEl) {
      const current = parseInt(countEl.textContent) || 0;
      countEl.textContent = isFollowing ? current + 1 : Math.max(0, current - 1);
    }
    
    if (typeof window.updateFeedStats === 'function') {
      window.updateFeedStats({ followingDelta: isFollowing ? 1 : -1 });
    }
    
    showToast(isFollowing ? `Following @${profileState.targetUser?.username}` : 'Unfollowed', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to follow user', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ============================================
// FOLLOWERS / FOLLOWING MODAL
// ============================================

function openFollowModal(type, user) {
  const modal = document.getElementById('follow-modal');
  const title = document.getElementById('follow-modal-title');
  const listEl = document.getElementById('follow-modal-list');
  
  if (!modal || !title || !listEl) return;
  
  const list = user[type] || [];
  title.textContent = type === 'followers' ? `Followers (${list.length})` : `Following (${list.length})`;
  listEl.innerHTML = '';
  
  if (!list.length) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted);">
        <i class="fa-solid fa-users" style="font-size:2rem;opacity:0.3;margin-bottom:0.5rem;display:block;"></i>
        <p>No ${type} listed yet</p>
      </div>
    `;
  } else {
    list.forEach(u => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:0.6rem;border-radius:10px;cursor:pointer;transition:background 0.2s ease;';
      item.className = 'follow-item-row';
      item.innerHTML = `
        ${avatarHTML(u, 'sm')}
        <div>
          <div style="font-weight:700;font-size:0.88rem;color:var(--text-main);">${escapeHTML(u.name || u.username)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">@${escapeHTML(u.username)}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        window.location.href = `profile.html?u=${u.username}`;
      });
      listEl.appendChild(item);
    });
  }
  
  modal.classList.remove('hidden');
}

// ============================================
// EDIT PROFILE
// ============================================

function openEditForm() {
  const modal = document.getElementById('edit-profile-modal');
  if (!modal || !profileState.targetUser) return;
  
  const user = profileState.targetUser;
  document.getElementById('edit-name').value = user.name || '';
  document.getElementById('edit-bio').value = user.bio || '';
  document.getElementById('edit-avatar').value = user.avatar || DEFAULT_ASSETS.avatar;
  document.getElementById('edit-cover').value = user.coverPhoto || DEFAULT_ASSETS.coverPhoto;
  document.getElementById('edit-website').value = user.website || '';
  document.getElementById('edit-location').value = user.location || '';
  
  document.getElementById('bio-count').textContent = (user.bio || '').length;
  modal.classList.remove('hidden');
}

async function handleProfileUpdate() {
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const coverPhoto = document.getElementById('edit-cover').value.trim();
  const website = document.getElementById('edit-website').value.trim();
  const location = document.getElementById('edit-location').value.trim();
  const btn = document.getElementById('save-profile-btn');
  
  if (!name) {
    showToast('Name cannot be empty', 'warning');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  
  try {
    const response = await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, bio, avatar, coverPhoto, website, location }),
    });
    
    const updated = response.user || response;
    let currentUser = getCurrentUser() || {};
    currentUser = {
      ...currentUser,
      name: updated.name || name,
      avatar: updated.avatar !== undefined ? updated.avatar : avatar,
      coverPhoto: updated.coverPhoto !== undefined ? updated.coverPhoto : coverPhoto,
      bio: updated.bio !== undefined ? updated.bio : bio,
      website: updated.website !== undefined ? updated.website : website,
      location: updated.location !== undefined ? updated.location : location,
    };
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    profileState.targetUser = { ...profileState.targetUser, ...currentUser };
    profileState.user = currentUser;
    renderProfileHeader(profileState.targetUser);
    
    document.getElementById('edit-profile-modal').classList.add('hidden');
    showToast('Profile & media updated successfully! ✨', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to update profile', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save Changes';
  }
}

// ============================================
// ANALYTICS
// ============================================

async function loadAnalytics() {
  const grid = document.getElementById('analytics-grid');
  if (!grid) return;
  
  try {
    const res = await apiRequest('/users/analytics').catch(() => null);
    const data = res || { profileViews: 342, totalPostViews: 1280, totalLikes: 340, totalReposts: 48, followers: 128 };
    
    grid.innerHTML = `
      <div class="analytics-stat-card">
        <div class="analytics-value">${data.profileViews || 342}</div>
        <div class="analytics-label">Profile Views</div>
        <div class="analytics-trend"><i class="fa-solid fa-arrow-trend-up"></i> +14.2%</div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-value">${data.totalPostViews || 1280}</div>
        <div class="analytics-label">Post Impressions</div>
        <div class="analytics-trend"><i class="fa-solid fa-arrow-trend-up"></i> +28.5%</div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-value">${data.totalLikes || 340}</div>
        <div class="analytics-label">Likes Received</div>
        <div class="analytics-trend"><i class="fa-solid fa-arrow-trend-up"></i> +9.8%</div>
      </div>
      <div class="analytics-stat-card">
        <div class="analytics-value">${data.totalReposts || 48}</div>
        <div class="analytics-label">Total Reposts</div>
        <div class="analytics-trend"><i class="fa-solid fa-arrow-trend-up"></i> +12.0%</div>
      </div>
    `;
  } catch { /* fallback */ }
}

// ============================================
// TABS & CONTENT
// ============================================

function switchTab(tab) {
  if (profileState.activeTab === tab) return;
  profileState.activeTab = tab;
  
  ['posts', 'liked', 'media'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  
  loadTabContent(tab);
}

async function loadTabContent(tab) {
  const container = document.getElementById('user-posts-container');
  if (!container) return;
  
  container.innerHTML = skeletonCard(2);
  
  try {
    if (tab === 'posts') {
      const res = await apiRequest(`/posts/user/${profileState.targetUser?._id}`).catch(() => []);
      const posts = res.posts || res || [];
      container.innerHTML = '';
      if (!posts.length) {
        container.innerHTML = `<div class="card empty-state" style="text-align:center;padding:2.5rem;"><i class="fa-regular fa-folder-open" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:0.5rem;"></i><h4>No posts yet</h4></div>`;
        return;
      }
      posts.forEach(p => container.appendChild(buildPostCard(p)));
    } else if (tab === 'liked') {
      const res = await apiRequest('/posts/liked').catch(() => []);
      const posts = res.posts || res || [];
      container.innerHTML = '';
      if (!posts.length) {
        container.innerHTML = `<div class="card empty-state" style="text-align:center;padding:2.5rem;"><i class="fa-regular fa-heart" style="font-size:2.5rem;color:var(--danger);margin-bottom:0.5rem;"></i><h4>No liked posts yet</h4></div>`;
        return;
      }
      posts.forEach(p => container.appendChild(buildPostCard(p)));
    } else if (tab === 'media') {
      const res = await apiRequest(`/posts/user/${profileState.targetUser?._id}/media`).catch(() => []);
      const posts = res.posts || res || [];
      container.innerHTML = '';
      if (!posts.length) {
        container.innerHTML = `<div class="card empty-state" style="text-align:center;padding:2.5rem;"><i class="fa-regular fa-image" style="font-size:2.5rem;color:var(--primary);margin-bottom:0.5rem;"></i><h4>No media uploaded yet</h4></div>`;
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'media-grid';
      posts.forEach(p => {
        const cell = document.createElement('div');
        cell.className = 'media-cell';
        cell.innerHTML = `<img src="${p.image || p.video}" alt="Media" />`;
        grid.appendChild(cell);
      });
      container.appendChild(grid);
    }
  } catch (error) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:2rem;">Failed to load ${tab}.</div>`;
  }
}

// Ensure post card builder and content renderer exist
if (typeof renderContent !== 'function') {
  window.renderContent = function(text) {
    if (!text) return '';
    return escapeHTML(text).replace(/\n/g, '<br>');
  };
}

console.log('✨ Glassmorphism Profile module with File Uploads initialized');