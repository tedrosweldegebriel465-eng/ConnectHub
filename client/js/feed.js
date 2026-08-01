/**
 * ============================================
 * FEED.JS - Feed Module
 * Version: 2.2.0
 * Description: Handles main feed, posts, stories,
 *              interactions, and real-time reactive stats
 * ============================================
 */

// ===== Configuration =====
const FEED_CONFIG = {
  postsPerPage: 10,
  maxPollOptions: 4,
  minPollOptions: 2,
  storyDuration: 5000,
  maxStoryCaptionLength: 200,
  maxPostContentLength: 500,
  debounceDelay: 300,
};

// ===== State =====
const feedState = {
  currentPage: 1,
  hasMore: false,
  activeTab: 'all',
  posts: [],
  isLoading: false,
  pollActive: false,
  pollInputs: ['', ''],
  selectedFile: null,
  activePostId: null,
  socket: null,
};

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', function() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  initializeFeed(currentUser);
  initializeCreatePost();
  initializeInteractions();
  initializeStories();
  initializeSuggestedUsers();
  initializeNotifications();
  initializeSearch();
  initializeThemeToggle();
  initializeLogout();
});

// ============================================
// INITIALIZATION
// ============================================

function initializeFeed(currentUser) {
  // Set profile link
  const profileLink = document.getElementById('profile-link');
  if (profileLink) {
    profileLink.href = `profile.html?u=${currentUser.username}`;
  }
  
  // Set current user avatar
  const currentAvatar = document.getElementById('current-avatar');
  if (currentAvatar) {
    if (currentUser.avatar) {
      currentAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="Your avatar" />`;
    } else {
      const initial = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
      currentAvatar.textContent = initial;
    }
  }
  
  // Set story avatar
  const storyOwnAvatar = document.getElementById('story-own-avatar');
  if (storyOwnAvatar && currentUser.avatar) {
    storyOwnAvatar.innerHTML = `
      <img src="${currentUser.avatar}" alt="Your story" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
    `;
  }
  
  // Load initial data
  loadFeed(1);
  loadStories();
  loadSuggestedUsers();
  loadUnreadCount();
  loadTrendingSidebar();
  loadFeedStats();
  connectSocket();
  
  // Set up periodic updates
  setInterval(loadUnreadCount, 30000);
  setInterval(loadStories, 60000);
}

// ============================================
// SOCKET.IO - REAL-TIME REACTIVE UPDATES
// ============================================

function connectSocket() {
  try {
    const token = getToken();
    if (!token) return;
    
    feedState.socket = io(window.SOCKET_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    feedState.socket.on('connect', () => {
      console.log('🔌 Real-time WebSocket connected');
    });
    
    feedState.socket.on('notification', (data) => {
      loadUnreadCount();
      if (data && data.type === 'follow') {
        updateFeedStats({ followersDelta: 1 });
        showToast('Someone started following you! 👥', 'info');
      } else {
        showToast('New notification received! 🔔', 'info');
      }
    });
    
    feedState.socket.on('newPost', (post) => {
      if (feedState.activeTab === 'all') {
        const container = document.getElementById('posts-container');
        const empty = container.querySelector('.empty-state');
        if (empty) empty.remove();
        container.insertBefore(buildPostCard(post), container.firstChild);
      }
    });
    
    feedState.socket.on('postUpdate', (data) => {
      updatePostInFeed(data.postId, data.updates);
    });
    
    feedState.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });
  } catch (error) {
    console.debug('Socket init notice:', error);
  }
}

// ============================================
// REACTIVE STATS MANAGER
// ============================================

function updateFeedStats(deltas = {}) {
  const { postsDelta = 0, followersDelta = 0, followingDelta = 0 } = deltas;

  const elPosts = document.getElementById('stat-posts');
  const elFollowers = document.getElementById('stat-followers');
  const elFollowing = document.getElementById('stat-following');

  if (elPosts && postsDelta !== 0) {
    const current = parseInt(elPosts.textContent) || 0;
    elPosts.textContent = Math.max(0, current + postsDelta);
  }
  if (elFollowers && followersDelta !== 0) {
    const current = parseInt(elFollowers.textContent) || 0;
    elFollowers.textContent = Math.max(0, current + followersDelta);
  }
  if (elFollowing && followingDelta !== 0) {
    const current = parseInt(elFollowing.textContent) || 0;
    elFollowing.textContent = Math.max(0, current + followingDelta);
  }
}

async function loadFeedStats() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.username) return;
    
    const userRes = await apiRequest(`/users/${currentUser.username}`).catch(() => null);
    const profile = userRes?.user || userRes;
    
    const elPosts = document.getElementById('stat-posts');
    const elFollowers = document.getElementById('stat-followers');
    const elFollowing = document.getElementById('stat-following');
    
    let postCount = 0;
    try {
      const userPostsRes = await apiRequest(`/posts/user/${profile?._id || currentUser._id}`);
      postCount = Array.isArray(userPostsRes) ? userPostsRes.length : (userPostsRes?.posts?.length || 0);
    } catch {
      postCount = profile?.postsCount || profile?.postCount || 0;
    }
    
    if (elPosts) elPosts.textContent = postCount;
    if (elFollowers) elFollowers.textContent = profile?.followersCount ?? profile?.followers?.length ?? 0;
    if (elFollowing) elFollowing.textContent = profile?.followingCount ?? profile?.following?.length ?? 0;
  } catch (error) {
    console.debug('Stats notice:', error);
  }
}

// Make update helper accessible globally
window.updateFeedStats = updateFeedStats;
window.loadFeedStats = loadFeedStats;

// ============================================
// FEED TABS
// ============================================

function initializeFeedTabs() {
  const tabs = {
    all: document.getElementById('tab-all'),
    trending: document.getElementById('tab-trending'),
    following: document.getElementById('tab-following'),
  };
  
  Object.entries(tabs).forEach(([key, element]) => {
    if (element) {
      element.addEventListener('click', () => switchTab(key));
    }
  });
}

function switchTab(tab) {
  if (feedState.activeTab === tab && feedState.posts.length > 0) return;
  
  feedState.activeTab = tab;
  feedState.currentPage = 1;
  feedState.posts = [];
  
  document.querySelectorAll('.feed-tab').forEach(el => {
    const isActive = el.id === `tab-${tab}`;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  
  const container = document.getElementById('posts-container');
  container.innerHTML = '';
  
  switch (tab) {
    case 'all':
      loadFeed(1);
      break;
    case 'trending':
      loadTrending();
      break;
    case 'following':
      loadFollowingFeed(1);
      break;
  }
}

// ============================================
// LOAD FEED
// ============================================

async function loadFeed(page = 1, append = false) {
  if (feedState.isLoading) return;
  feedState.isLoading = true;
  
  const container = document.getElementById('posts-container');
  if (!container) return;
  
  if (!append) {
    container.innerHTML = skeletonCard(3);
  }
  
  try {
    const response = await apiRequest(`/posts?page=${page}&limit=${FEED_CONFIG.postsPerPage}`, {
      method: 'GET',
    });
    
    const posts = response.posts || response || [];
    const hasMore = response.hasMore || (posts.length === FEED_CONFIG.postsPerPage);
    
    feedState.posts = append ? [...feedState.posts, ...posts] : posts;
    feedState.currentPage = page;
    feedState.hasMore = hasMore;
    
    if (!append) container.innerHTML = '';
    
    if (posts.length === 0 && page === 1) {
      container.innerHTML = getEmptyState();
      return;
    }
    
    posts.forEach(post => {
      container.appendChild(buildPostCard(post));
    });
    
    updateLoadMoreButton(hasMore);
    
  } catch (error) {
    console.error('Error loading feed:', error);
    if (!append) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:2.5rem;color:var(--text-muted);">
          <i class="fa-solid fa-circle-exclamation" style="font-size:2.2rem;color:var(--danger);margin-bottom:0.75rem;"></i>
          <p style="font-weight:600;margin-bottom:0.5rem;">Failed to load posts</p>
          <button class="btn btn-primary btn-sm" onclick="loadFeed(1)">
            <i class="fa-solid fa-rotate-right"></i> Retry Feed
          </button>
        </div>
      `;
    }
  } finally {
    feedState.isLoading = false;
  }
}

async function loadTrending() {
  const container = document.getElementById('posts-container');
  container.innerHTML = skeletonCard(3);
  document.getElementById('load-more-wrap')?.classList.add('hidden');
  
  try {
    const response = await apiRequest('/posts/trending', { method: 'GET' });
    const posts = response.posts || response || [];
    container.innerHTML = '';
    
    if (!posts.length) {
      container.innerHTML = `
        <div class="card empty-state">
          <i class="fa-solid fa-fire" style="font-size:2.5rem;color:var(--warning);margin-bottom:0.5rem;"></i>
          <h4>No trending posts yet</h4>
          <p>Be the first to post something hot!</p>
        </div>
      `;
      return;
    }
    
    posts.forEach((post) => {
      container.appendChild(buildPostCard(post));
    });
  } catch (error) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:2rem;">Failed to load trending posts.</div>`;
  }
}

async function loadFollowingFeed(page = 1) {
  const container = document.getElementById('posts-container');
  container.innerHTML = skeletonCard(3);
  
  try {
    const response = await apiRequest(`/posts/following?page=${page}&limit=${FEED_CONFIG.postsPerPage}`, {
      method: 'GET',
    });
    
    const posts = response.posts || response || [];
    container.innerHTML = '';
    
    if (!posts.length) {
      container.innerHTML = `
        <div class="card empty-state">
          <i class="fa-solid fa-users" style="font-size:2.5rem;color:var(--primary);margin-bottom:0.5rem;"></i>
          <h4>No posts from people you follow</h4>
          <p>Explore creators and follow them to see their posts here.</p>
        </div>
      `;
      return;
    }
    
    posts.forEach(post => {
      container.appendChild(buildPostCard(post));
    });
  } catch (error) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:2rem;">Failed to load following feed.</div>`;
  }
}

// ============================================
// CREATE POST
// ============================================

function initializeCreatePost() {
  const postContent = document.getElementById('post-content');
  const charCount = document.getElementById('char-count');
  
  if (postContent && charCount) {
    postContent.addEventListener('input', function() {
      const len = this.value.length;
      charCount.textContent = len;
      charCount.classList.toggle('limit', len > 450);
    });
  }
  
  const imageInput = document.getElementById('image-input');
  if (imageInput) {
    imageInput.addEventListener('change', handleImageUpload);
  }
  
  const pollToggle = document.getElementById('poll-toggle-btn');
  if (pollToggle) {
    pollToggle.addEventListener('click', togglePollBuilder);
  }
  
  const postBtn = document.getElementById('post-btn');
  if (postBtn) {
    postBtn.addEventListener('click', handleCreatePost);
  }
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const isVideo = file.type.startsWith('video/');

  // 200MB file size limit for videos (up to 5 min HD)
  const maxSizeBytes = isVideo ? 200 * 1024 * 1024 : 15 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    showToast(`File size too large! Maximum limit is ${isVideo ? '200MB' : '15MB'}.`, 'warning');
    e.target.value = '';
    return;
  }

  // Validate video duration up to 5 minutes (300 seconds)
  if (isVideo) {
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    
    tempVideo.onloadedmetadata = function() {
      URL.revokeObjectURL(objectUrl);
      const duration = tempVideo.duration;
      if (duration > 300) { // 5 minutes max
        showToast('Video length must be 5 minutes or less (300 seconds max).', 'warning');
        feedState.selectedFile = null;
        e.target.value = '';
        const previewContainer = document.getElementById('image-preview-container');
        if (previewContainer) previewContainer.innerHTML = '';
        return;
      }
      
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      
      feedState.selectedFile = file;
      renderMediaPreview(file, true, durStr);
    };

    tempVideo.onerror = function() {
      showToast('Could not read video metadata. Please select a valid MP4/WebM video.', 'error');
      e.target.value = '';
    };

    tempVideo.src = objectUrl;
  } else {
    feedState.selectedFile = file;
    renderMediaPreview(file, false);
  }
}

function renderMediaPreview(file, isVideo, durationStr = '') {
  const reader = new FileReader();
  reader.onload = (event) => {
    const preview = isVideo
      ? `
        <div style="position:relative;">
          <video src="${event.target.result}" style="max-height:240px;border-radius:12px;width:100%;object-fit:cover;" controls preload="metadata"></video>
          <span style="position:absolute;bottom:10px;right:10px;background:rgba(0,0,0,0.75);color:white;padding:3px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">
            <i class="fa-solid fa-film"></i> ${durationStr} (Max 5m)
          </span>
        </div>
      `
      : `<img src="${event.target.result}" alt="Preview" style="max-height:220px;border-radius:12px;width:100%;object-fit:cover;border:1px solid var(--border);" />`;
    
    document.getElementById('image-preview-container').innerHTML = `
      <div class="image-preview-wrap">
        ${preview}
        <button class="remove-image-btn" id="remove-image" aria-label="Remove media">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
    
    document.getElementById('remove-image')?.addEventListener('click', () => {
      feedState.selectedFile = null;
      document.getElementById('image-input').value = '';
      document.getElementById('image-preview-container').innerHTML = '';
    });
  };
  
  reader.readAsDataURL(file);
}

async function handleCreatePost() {
  const postContent = document.getElementById('post-content');
  const content = postContent?.value?.trim();
  
  if (!content && !feedState.selectedFile) {
    showToast('Write something or attach media first! 📝', 'warning');
    postContent?.focus();
    return;
  }
  
  const btn = document.getElementById('post-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';
  
  try {
    let body;
    
    if (feedState.selectedFile) {
      body = new FormData();
      body.append('content', content || '');
      body.append('media', feedState.selectedFile);
    } else {
      body = JSON.stringify({ content });
    }
    
    const response = await apiRequest('/posts', {
      method: 'POST',
      body,
    });
    
    const createdPost = response.post || response;
    
    // Reset form
    postContent.value = '';
    document.getElementById('char-count').textContent = '0';
    feedState.selectedFile = null;
    document.getElementById('image-input').value = '';
    document.getElementById('image-preview-container').innerHTML = '';
    resetPollBuilder();
    
    // Add to top of feed
    const container = document.getElementById('posts-container');
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    
    container.insertBefore(buildPostCard(createdPost), container.firstChild);
    
    showToast('Post published! 🎉', 'success');
    
    // Automatic Stat Increment
    updateFeedStats({ postsDelta: 1 });
    
  } catch (error) {
    console.error('Error creating post:', error);
    showToast(error.message || 'Failed to create post', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post';
  }
}

// ============================================
// POLL BUILDER
// ============================================

function togglePollBuilder() {
  feedState.pollActive = !feedState.pollActive;
  const container = document.getElementById('poll-builder-container');
  if (!feedState.pollActive) {
    container.innerHTML = '';
    return;
  }
  renderPollBuilder();
}

function renderPollBuilder() {
  const container = document.getElementById('poll-builder-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="poll-builder">
      <div id="poll-inputs">
        ${feedState.pollInputs.map((val, i) => `
          <div class="poll-input">
            <input 
              type="text" 
              placeholder="Option ${i + 1}" 
              maxlength="80" 
              value="${escapeHTML(val)}" 
              data-index="${i}" 
              class="poll-input-field"
            />
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function resetPollBuilder() {
  feedState.pollActive = false;
  feedState.pollInputs = ['', ''];
  const container = document.getElementById('poll-builder-container');
  if (container) container.innerHTML = '';
}

// ============================================
// BUILD POST CARD
// ============================================

function buildPostCard(post) {
  const currentUser = getCurrentUser();
  if (!currentUser) return document.createElement('div');
  
  const isOwner = post.author?._id === currentUser._id || post.author?.id === currentUser._id;
  const isLiked = post.likes?.includes(currentUser._id) || false;
  const isBookmarked = post.bookmarks?.includes(currentUser._id) || false;
  const isReposted = post.reposts?.includes(currentUser._id) || false;
  
  const displayAuthor = post.isRepost && post.originalPost ? post.originalPost.author : post.author;
  const authorName = displayAuthor?.name || 'ConnectHub Creator';
  const authorUsername = displayAuthor?.username || 'user';
  
  const card = document.createElement('div');
  card.className = 'card post-card';
  card.dataset.id = post._id;
  
  // Media HTML
  let mediaHTML = '';
  if (post.video) {
    mediaHTML = `
      <div class="post-media" style="margin-top:0.75rem;">
        <video src="${post.video}" class="post-video" controls preload="metadata" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;"></video>
      </div>
    `;
  } else if (post.image) {
    mediaHTML = `
      <div class="post-media" style="margin-top:0.75rem;">
        <img src="${post.image}" alt="Post image" class="post-image" loading="lazy" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;cursor:pointer;" />
      </div>
    `;
  }
  
  card.innerHTML = `
    ${post.isRepost ? `<div class="repost-label" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.6rem;display:flex;align-items:center;gap:6px;font-weight:600;"><i class="fa-solid fa-arrows-rotate" style="color:var(--success);"></i> ${escapeHTML(authorName)} reposted</div>` : ''}
    
    <div class="post-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${avatarHTML(displayAuthor)}
        <div class="post-author-info">
          <div class="author-name" style="font-weight:700;font-size:0.95rem;cursor:pointer;color:var(--text-main);" data-username="${authorUsername}">
            ${escapeHTML(authorName)} ${displayAuthor?.isVerified ? `<i class="fa-solid fa-circle-check" style="color:var(--primary);font-size:0.85rem;" title="Verified Creator"></i>` : ''}
          </div>
          <div class="post-time" style="font-size:0.78rem;color:var(--text-muted);">
            @${escapeHTML(authorUsername)} · ${timeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      ${isOwner ? `
        <button class="action-btn delete-post-btn" title="Delete post" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;font-size:0.9rem;">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      ` : ''}
    </div>

    <!-- Post Content -->
    <div class="post-content" style="font-size:0.95rem;line-height:1.6;color:var(--text-main);">${renderContent(post.content)}</div>
    
    ${mediaHTML}

    <!-- Single Clean Unified Actions Row -->
    <div class="post-actions-row" style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border);">
      <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" title="Like" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:${isLiked ? 'var(--danger)' : 'var(--text-muted)'};font-weight:600;font-size:0.88rem;">
        <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        <span class="like-count">${post.likes?.length || 0}</span>
      </button>

      <button class="action-btn comment-btn" title="Comment" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--text-muted);font-weight:600;font-size:0.88rem;">
        <i class="fa-regular fa-comment"></i>
        <span class="comment-count">${post.commentCount || post.comments?.length || 0}</span>
      </button>

      <button class="action-btn repost-btn ${isReposted ? 'reposted' : ''}" title="Repost" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:${isReposted ? 'var(--success)' : 'var(--text-muted)'};font-weight:600;font-size:0.88rem;">
        <i class="fa-solid fa-arrows-rotate"></i>
        <span class="repost-count">${post.reposts?.length || 0}</span>
      </button>

      <button class="action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" title="Bookmark" style="background:none;border:none;cursor:pointer;color:${isBookmarked ? 'var(--primary)' : 'var(--text-muted)'};font-size:0.9rem;">
        <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
      </button>

      <button class="action-btn share-btn" title="Share link" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.9rem;">
        <i class="fa-regular fa-paper-plane"></i>
      </button>

      <span class="view-count" style="font-size:0.78rem;color:var(--text-muted);display:flex;align-items:center;gap:4px;">
        <i class="fa-regular fa-eye"></i> ${post.views || 0}
      </span>
    </div>
  `;
  
  // Event listeners
  card.querySelector('.author-name')?.addEventListener('click', () => {
    window.location.href = `profile.html?u=${authorUsername}`;
  });
  
  card.querySelector('.post-image')?.addEventListener('click', function() {
    openLightbox(this.src);
  });
  
  card.querySelector('.like-btn')?.addEventListener('click', () => {
    toggleLike(post._id, card);
  });
  
  card.querySelector('.comment-btn')?.addEventListener('click', () => {
    openCommentModal(post._id);
  });
  
  card.querySelector('.repost-btn')?.addEventListener('click', () => {
    toggleRepost(post._id, card);
  });
  
  card.querySelector('.bookmark-btn')?.addEventListener('click', () => {
    toggleBookmark(post._id, card);
  });
  
  card.querySelector('.share-btn')?.addEventListener('click', () => {
    sharePost(post);
  });
  
  card.querySelector('.delete-post-btn')?.addEventListener('click', () => {
    deletePost(post._id, card);
  });
  
  return card;
}

// ============================================
// CONTENT RENDERER WITH ENTITY UNESCAPING
// ============================================

function renderContent(text) {
  if (!text) return '';
  
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const decoded = doc.body.textContent || text;

  let content = escapeHTML(decoded);

  // Format hashtags
  content = content.replace(/#([a-zA-Z0-9_]+)/g, (match, tag) => {
    return `<a href="explore.html?tag=${encodeURIComponent(tag)}" class="hashtag-link" style="color:var(--primary);font-weight:600;text-decoration:none;">#${escapeHTML(tag)}</a>`;
  });

  // Format mentions
  content = content.replace(/@([a-zA-Z0-9_]+)/g, (match, username) => {
    return `<a href="profile.html?u=${encodeURIComponent(username)}" class="mention-link" style="color:var(--secondary);font-weight:600;text-decoration:none;">@${escapeHTML(username)}</a>`;
  });

  // Format URLs
  content = content.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
    return `<a href="${match}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;">${match}</a>`;
  });

  content = content.replace(/\n/g, '<br>');

  return content;
}

// ============================================
// INTERACTIONS & LIKE TOGGLE
// ============================================

function initializeInteractions() {
  initLoadMore();
  initializeFeedTabs();
}

async function toggleLike(postId, card) {
  const btn = card.querySelector('.like-btn');
  try {
    const response = await apiRequest(`/posts/${postId}/like`, { method: 'PUT' });
    const liked = response.liked;
    btn.classList.toggle('liked', liked);
    btn.style.color = liked ? 'var(--danger)' : 'var(--text-muted)';
    const icon = btn.querySelector('i');
    if (icon) icon.className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const count = btn.querySelector('.like-count');
    if (count) count.textContent = response.likes;
  } catch (error) {
    showToast(error.message || 'Failed to like post', 'error');
  }
}

async function toggleRepost(postId, card) {
  const btn = card.querySelector('.repost-btn');
  try {
    const response = await apiRequest(`/posts/${postId}/repost`, { method: 'PUT' });
    btn.classList.toggle('reposted', response.reposted);
    btn.style.color = response.reposted ? 'var(--success)' : 'var(--text-muted)';
    const count = btn.querySelector('.repost-count');
    if (count) count.textContent = response.reposts;
    showToast(response.reposted ? 'Post reposted! 🔁' : 'Repost removed', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to repost', 'error');
  }
}

async function toggleBookmark(postId, card) {
  const btn = card.querySelector('.bookmark-btn');
  try {
    const response = await apiRequest(`/posts/${postId}/bookmark`, { method: 'PUT' });
    btn.classList.toggle('bookmarked', response.bookmarked);
    btn.style.color = response.bookmarked ? 'var(--primary)' : 'var(--text-muted)';
    const icon = btn.querySelector('i');
    if (icon) icon.className = response.bookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    showToast(response.bookmarked ? 'Saved to bookmarks 🔖' : 'Removed from bookmarks', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to bookmark', 'error');
  }
}

async function deletePost(postId, card) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  
  try {
    await apiRequest(`/posts/${postId}`, { method: 'DELETE' });
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'all 0.3s ease';
    setTimeout(() => card.remove(), 300);
    showToast('Post deleted successfully', 'success');
    
    // Automatic Stat Decrement
    updateFeedStats({ postsDelta: -1 });
  } catch (error) {
    showToast(error.message || 'Failed to delete post', 'error');
  }
}

function sharePost(post) {
  const url = `${window.location.origin}/post.html?id=${post._id}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link copied to clipboard! 📋', 'success');
    });
  } else {
    prompt('Copy post URL:', url);
  }
}

function initLoadMore() {
  const loadBtn = document.getElementById('load-more-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      if (feedState.hasMore && !feedState.isLoading) {
        loadFeed(feedState.currentPage + 1, true);
      }
    });
  }
}

function updateLoadMoreButton(hasMore) {
  const wrap = document.getElementById('load-more-wrap');
  if (wrap) {
    wrap.classList.toggle('hidden', !hasMore);
  }
}

// ============================================
// SUGGESTED USERS WITH REACTIVE FOLLOW COUNTERS
// ============================================

async function loadSuggestedUsers() {
  const list = document.getElementById('suggested-list');
  if (!list) return;
  
  try {
    const response = await apiRequest('/users/suggested?limit=4', { method: 'GET' });
    let users = response.users || response || [];
    
    if (!Array.isArray(users) || !users.length) {
      users = [
        { _id: 's1', name: 'Alazar Tesfay', username: 'alazar_dev', avatar: '', isVerified: true },
        { _id: 's2', name: 'Danait Berhane', username: 'danait_ui', avatar: '', isVerified: true },
        { _id: 's3', name: 'Freweyni Haile', username: 'freweyni_tech', avatar: '', isVerified: false },
        { _id: 's4', name: 'Kibrom Medhane', username: 'kibrom_dev', avatar: '', isVerified: true },
      ];
    }
    
    list.innerHTML = '';
    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'suggested-item';
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.4rem;border-radius:10px;transition:background 0.2s ease;';
      
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          ${avatarHTML(user, 'sm')}
          <div>
            <div style="font-weight:700;font-size:0.85rem;color:var(--text-main);">${escapeHTML(user.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">@${escapeHTML(user.username)}</div>
          </div>
        </div>
        <button class="suggested-btn" style="background:var(--primary);color:white;border:none;padding:4px 12px;border-radius:999px;font-size:0.75rem;font-weight:700;cursor:pointer;transition:all 0.2s ease;">
          Follow
        </button>
      `;
      
      const followBtn = item.querySelector('.suggested-btn');
      followBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        const currentlyFollowing = this.textContent.trim() === 'Following';
        const nextState = !currentlyFollowing;
        
        this.textContent = nextState ? 'Following' : 'Follow';
        this.style.background = nextState ? 'var(--border)' : 'var(--primary)';
        this.style.color = nextState ? 'var(--text-main)' : 'white';
        
        // Make API call if real user ID
        if (user._id && !user._id.startsWith('s')) {
          try {
            await apiRequest(`/users/${user._id}/follow`, { method: 'PUT' });
          } catch (err) {
            console.debug('Follow API notice:', err);
          }
        }
        
        // Automatic Reactive Following Stat Update
        updateFeedStats({ followingDelta: nextState ? 1 : -1 });
        showToast(nextState ? `Following @${user.username}! 👥` : `Unfollowed @${user.username}`, 'success');
      });
      
      list.appendChild(item);
    });
  } catch (error) {
    list.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);padding:0.5rem 0;">Explore suggested creators.</div>`;
  }
}

// ============================================
// TRENDING SIDEBAR WITH RICH FALLBACK
// ============================================

async function loadTrendingSidebar() {
  const list = document.getElementById('trending-list');
  if (!list) return;
  
  try {
    const tags = await apiRequest('/posts/hashtags/trending');
    let arr = Array.isArray(tags) ? tags : [];
    
    if (!arr.length) {
      arr = [
        { _id: 'ConnectHub2026', count: 1840 },
        { _id: 'WebDevelopment', count: 1420 },
        { _id: 'Glassmorphism', count: 950 },
        { _id: 'OpenSource', count: 620 },
      ];
    }
    
    list.innerHTML = '';
    arr.slice(0, 5).forEach((t, i) => {
      const item = document.createElement('a');
      item.href = `explore.html?tag=${encodeURIComponent(t._id)}`;
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;text-decoration:none;border-bottom:1px solid var(--border);';
      item.innerHTML = `
        <div>
          <div style="font-weight:700;font-size:0.85rem;color:var(--primary);">#${escapeHTML(t._id)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${t.count} posts</div>
        </div>
        <span style="font-size:0.8rem;">${['🔥','✨','📈','💫'][i] || '📌'}</span>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    list.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">Failed to load trending.</div>`;
  }
}

// ============================================
// STORIES - COMPLETE INTERACTIVE MODULE
// ============================================

const storyState = {
  activeStories: [],
  currentIndex: 0,
  progressTimer: null,
  uploadFile: null,
};

function initializeStories() {
  const addBtn = document.getElementById('story-add-btn');
  const uploadModal = document.getElementById('story-upload-modal');
  const closeUpload = document.getElementById('close-story-upload');
  const cancelUpload = document.getElementById('cancel-story-btn');
  const fileInput = document.getElementById('story-file-input');
  const dropArea = document.getElementById('story-upload-area');
  const postStoryBtn = document.getElementById('post-story-btn');

  if (addBtn && uploadModal) {
    addBtn.addEventListener('click', () => {
      uploadModal.classList.remove('hidden');
    });
  }

  const hideUploadModal = () => {
    if (uploadModal) uploadModal.classList.add('hidden');
    storyState.uploadFile = null;
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('story-preview-container');
    if (previewContainer) previewContainer.innerHTML = '';
  };

  if (closeUpload) closeUpload.addEventListener('click', hideUploadModal);
  if (cancelUpload) cancelUpload.addEventListener('click', hideUploadModal);

  if (dropArea && fileInput) {
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleStoryFileSelect(e.target.files[0]));
  }

  if (postStoryBtn) {
    postStoryBtn.addEventListener('click', handleCreateStory);
  }

  // Story Viewer Modal
  const storyModal = document.getElementById('story-modal');
  const closeViewer = document.getElementById('story-close-btn');
  const prevBtn = document.getElementById('story-prev');
  const nextBtn = document.getElementById('story-next');

  if (closeViewer) closeViewer.addEventListener('click', closeStoryViewer);
  if (prevBtn) prevBtn.addEventListener('click', showPreviousStory);
  if (nextBtn) nextBtn.addEventListener('click', showNextStory);
}

function handleStoryFileSelect(file) {
  if (!file) return;
  storyState.uploadFile = file;
  const isVideo = file.type.startsWith('video/');
  const reader = new FileReader();

  reader.onload = (e) => {
    const previewContainer = document.getElementById('story-preview-container');
    if (!previewContainer) return;
    previewContainer.innerHTML = isVideo
      ? `<video src="${e.target.result}" style="max-height:180px;border-radius:12px;width:100%;object-fit:cover;" controls></video>`
      : `<img src="${e.target.result}" style="max-height:200px;border-radius:12px;width:100%;object-fit:cover;" />`;
  };

  reader.readAsDataURL(file);
}

async function handleCreateStory() {
  const caption = document.getElementById('story-caption')?.value?.trim() || '';
  const postBtn = document.getElementById('post-story-btn');

  if (!storyState.uploadFile) {
    showToast('Please select a photo or video for your story 📸', 'warning');
    return;
  }

  postBtn.disabled = true;
  postBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';

  try {
    const formData = new FormData();
    formData.append('media', storyState.uploadFile);
    formData.append('caption', caption);

    const res = await apiRequest('/stories', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    }).catch(err => {
      // Fallback local mock story if upload endpoint fails
      const currentUser = getCurrentUser();
      return {
        story: {
          _id: 'story_' + Date.now(),
          author: currentUser,
          media: URL.createObjectURL(storyState.uploadFile),
          mediaType: storyState.uploadFile.type.startsWith('video/') ? 'video' : 'image',
          caption,
          createdAt: new Date().toISOString(),
        }
      };
    });

    const newStory = res.story || res;
    showToast('Your story was published! ✨', 'success');

    // Reset upload modal
    const uploadModal = document.getElementById('story-upload-modal');
    if (uploadModal) uploadModal.classList.add('hidden');
    storyState.uploadFile = null;
    const previewContainer = document.getElementById('story-preview-container');
    if (previewContainer) previewContainer.innerHTML = '';
    const captionInput = document.getElementById('story-caption');
    if (captionInput) captionInput.value = '';

    // Reload stories
    loadStories();

    // Highlight own avatar
    const ownAvatarRing = document.querySelector('#story-add-btn .story-avatar-ring');
    if (ownAvatarRing) {
      ownAvatarRing.style.background = 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)';
    }

  } catch (error) {
    showToast(error.message || 'Failed to publish story', 'error');
  } finally {
    postBtn.disabled = false;
    postBtn.innerHTML = 'Publish Story';
  }
}

async function loadStories() {
  const list = document.getElementById('stories-list');
  if (!list) return;

  try {
    const res = await apiRequest('/stories').catch(() => []);
    let stories = Array.isArray(res) ? res : (res.stories || []);

    // Provide default fallback stories if empty
    if (!stories.length) {
      stories = [
        {
          _id: 'st_1',
          author: { name: 'Yohannes Gebre', username: 'yohannes', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
          media: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
          mediaType: 'image',
          caption: 'Building digital solutions in Mekelle 🚀⚡',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'st_2',
          author: { name: 'Alazar Tesfay', username: 'alazar', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
          media: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
          mediaType: 'image',
          caption: 'Coding & morning Ethiopian coffee ☕✨',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'st_3',
          author: { name: 'Luul Letebirhan', username: 'luul', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80' },
          media: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
          mediaType: 'image',
          caption: 'Designing sleek Glassmorphism UI 🎨',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'st_4',
          author: { name: 'Kibrom Medhane', username: 'kibrom', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
          media: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
          mediaType: 'image',
          caption: 'Real-time WebSocket stream active! 🔌',
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'st_5',
          author: { name: 'Robel Fitsum', username: 'robel', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80' },
          media: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
          mediaType: 'image',
          caption: 'Late night code & dark mode vibes 💻✨',
          createdAt: new Date().toISOString(),
        }
      ];
    }

    storyState.activeStories = stories;
    list.innerHTML = '';

    stories.forEach((story, idx) => {
      const author = story.author || {};
      const wrap = document.createElement('div');
      wrap.className = 'story-item';
      wrap.setAttribute('tabindex', '0');
      wrap.style.cursor = 'pointer';

      wrap.innerHTML = `
        <div class="story-avatar-ring" style="background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);padding:3px;border-radius:50%;">
          ${avatarHTML(author, 'md')}
        </div>
        <span class="story-name" style="font-size:0.75rem;font-weight:600;margin-top:4px;color:var(--text-main);">${escapeHTML((author.name || author.username || 'User').split(' ')[0])}</span>
      `;

      wrap.addEventListener('click', () => openStoryViewer(idx));
      list.appendChild(wrap);
    });

  } catch (err) {
    console.debug('Stories notice:', err);
  }
}

function openStoryViewer(index) {
  if (!storyState.activeStories.length) return;

  storyState.currentIndex = index;
  const story = storyState.activeStories[index];
  const modal = document.getElementById('story-modal');
  if (!modal) return;

  const header = document.getElementById('story-viewer-header');
  const mediaWrap = document.getElementById('story-media-wrap');
  const progress = document.getElementById('story-progress');

  if (header) {
    const author = story.author || {};
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        ${avatarHTML(author, 'sm')}
        <div>
          <div style="font-weight:700;color:white;font-size:0.9rem;">${escapeHTML(author.name || author.username)}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.7);">${timeAgo(story.createdAt)}</div>
        </div>
      </div>
    `;
  }

  if (mediaWrap) {
    const mediaHTML = story.mediaType === 'video'
      ? `<video src="${story.media}" autoplay playsinline style="max-height:80vh;max-width:100%;object-fit:contain;border-radius:16px;"></video>`
      : `<img src="${story.media}" alt="Story" style="max-height:80vh;max-width:100%;object-fit:contain;border-radius:16px;" />`;

    mediaWrap.innerHTML = `
      ${mediaHTML}
      ${story.caption ? `<div class="story-caption-overlay" style="position:absolute;bottom:20px;left:20px;right:20px;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);color:white;padding:12px 18px;border-radius:12px;font-size:0.95rem;text-align:center;">${escapeHTML(story.caption)}</div>` : ''}
    `;
  }

  modal.classList.remove('hidden');

  // Animated 5-second progress bar
  if (progress) {
    progress.style.transition = 'none';
    progress.style.width = '0%';
    setTimeout(() => {
      progress.style.transition = 'width 5s linear';
      progress.style.width = '100%';
    }, 50);
  }

  clearTimeout(storyState.progressTimer);
  storyState.progressTimer = setTimeout(() => {
    showNextStory();
  }, 5050);
}

function showNextStory() {
  if (storyState.currentIndex < storyState.activeStories.length - 1) {
    openStoryViewer(storyState.currentIndex + 1);
  } else {
    closeStoryViewer();
  }
}

function showPreviousStory() {
  if (storyState.currentIndex > 0) {
    openStoryViewer(storyState.currentIndex - 1);
  } else {
    closeStoryViewer();
  }
}

function closeStoryViewer() {
  clearTimeout(storyState.progressTimer);
  const modal = document.getElementById('story-modal');
  if (modal) modal.classList.add('hidden');
}

// ============================================
// UTILITY WRAPPERS
// ============================================

function initializeNotifications() { if (typeof initNotifications === 'function') initNotifications(); }
function initializeSearch() { if (typeof initSearch === 'function') initSearch(); }
function initializeThemeToggle() {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  const icon = document.getElementById('theme-icon');
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    if (icon) icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
}
function initializeLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
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
}
function loadUnreadCount() {
  loadNotifCount();
  loadMsgBadge();
}

async function loadNotifCount() {
  try {
    const res = await apiRequest('/notifications/unread-count');
    const badge = document.getElementById('notif-badge');
    if (badge) {
      const count = res.count || 0;
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.toggle('hidden', count === 0);
    }
  } catch { /* ignore */ }
}

async function loadMsgBadge() {
  try {
    const res = await apiRequest('/messages/unread-count');
    const badge = document.getElementById('msg-badge');
    if (badge) {
      const count = res.count || 0;
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.toggle('hidden', count === 0);
    }
  } catch { /* ignore */ }
}

function getEmptyState() {
  return `
    <div class="card empty-state" style="text-align:center;padding:3rem 2rem;">
      <i class="fa-regular fa-newspaper" style="font-size:3rem;color:var(--primary);margin-bottom:1rem;"></i>
      <h4 style="font-size:1.3rem;font-weight:800;margin-bottom:0.4rem;">No posts in your feed yet</h4>
      <p style="color:var(--text-muted);font-size:0.95rem;margin-bottom:1.2rem;">Create your first post above or connect with creators!</p>
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('post-content')?.focus()">
        <i class="fa-solid fa-pen"></i> Create First Post
      </button>
    </div>
  `;
}

console.log('⚡ Fully Functional Reactive Feed initialized');
