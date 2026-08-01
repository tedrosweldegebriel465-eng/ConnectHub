/**
 * ============================================
 * EXPLORE.JS - Professional Glassmorphism Explore Module
 * Version: 2.2.0
 * Description: Handles discovery, trending posts, categories,
 *              hashtag filtering, top creators, and stats
 * ============================================
 */

// ===== State =====
const exploreState = {
  activeTab: 'trending',
  activeCategory: 'all',
  activeTag: null,
  searchQuery: '',
  currentPage: 1,
  isLoading: false,
  posts: [],
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

  initializeExplore();
  initializeCategoryPills();
  initializeExploreTabs();
  initializeSearch();
  initializeHashtagParam();
});

// ============================================
// INITIALIZATION
// ============================================

function initializeExplore() {
  loadTrendingHashtags();
  loadPopularCreators();
  loadExploreStats();
  loadExplorePosts('trending');
}

function initializeCategoryPills() {
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', function() {
      const category = this.dataset.category;
      pills.forEach(p => p.classList.remove('active'));
      this.classList.add('active');

      exploreState.activeCategory = category;
      exploreState.currentPage = 1;
      loadExplorePosts(exploreState.activeTab);
    });
  });
}

function initializeExploreTabs() {
  const tabs = document.querySelectorAll('.explore-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      exploreState.activeTab = tabId;
      exploreState.currentPage = 1;
      loadExplorePosts(tabId);
    });
  });
}

function initializeSearch() {
  const input = document.getElementById('explore-search-input');
  const btn = document.getElementById('explore-search-btn');

  if (input) {
    let timer;
    input.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        exploreState.searchQuery = this.value.trim();
        loadExplorePosts(exploreState.activeTab);
      }, 400);
    });

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        exploreState.searchQuery = this.value.trim();
        loadExplorePosts(exploreState.activeTab);
      }
    });
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const query = input?.value?.trim() || '';
      exploreState.searchQuery = query;
      loadExplorePosts(exploreState.activeTab);
    });
  }
}

function initializeHashtagParam() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag');
  if (tag) {
    exploreState.activeTag = tag;
    loadTagPosts(tag);
  }
}

// ============================================
// LOAD EXPLORE POSTS
// ============================================

async function loadExplorePosts(tab = 'trending') {
  if (exploreState.isLoading) return;
  exploreState.isLoading = true;

  const container = document.getElementById('explore-posts-container');
  if (!container) return;

  container.innerHTML = skeletonCard(3);

  try {
    let endpoint = '/posts/trending';
    if (tab === 'recent') endpoint = '/posts?limit=20';
    else if (tab === 'media') endpoint = '/posts?limit=20';
    else if (tab === 'people') {
      loadPeopleTab();
      exploreState.isLoading = false;
      return;
    }

    const response = await apiRequest(endpoint, { method: 'GET' }).catch(() => null);
    let posts = Array.isArray(response) ? response : (response?.posts || []);

    // Filter by query if present
    if (exploreState.searchQuery) {
      const q = exploreState.searchQuery.toLowerCase();
      posts = posts.filter(p => (p.content || '').toLowerCase().includes(q) || (p.author?.name || '').toLowerCase().includes(q));
    }

    // Filter by media tab if selected
    if (tab === 'media') {
      posts = posts.filter(p => p.image || p.video);
    }

    // Filter by tag if selected
    if (exploreState.activeTag) {
      const tag = exploreState.activeTag.toLowerCase();
      posts = posts.filter(p => (p.content || '').toLowerCase().includes(`#${tag}`));
    }

    container.innerHTML = '';

    if (!posts.length) {
      container.innerHTML = `
        <div class="card empty-state" style="text-align:center;padding:3rem 2rem;">
          <i class="fa-solid fa-compass" style="font-size:2.8rem;color:var(--primary);margin-bottom:1rem;"></i>
          <h4 style="font-weight:800;margin-bottom:0.4rem;">No matching content found</h4>
          <p style="color:var(--text-muted);font-size:0.9rem;">Try adjusting your search query or category filters.</p>
        </div>
      `;
      return;
    }

    posts.forEach(post => {
      container.appendChild(buildPostCard(post));
    });

  } catch (error) {
    console.error('Error loading explore posts:', error);
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:2rem;">
        <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;color:var(--danger);margin-bottom:0.5rem;"></i>
        <p>Failed to load posts. Please try again.</p>
      </div>
    `;
  } finally {
    exploreState.isLoading = false;
  }
}

// ============================================
// TOP CREATORS (PEOPLE TAB)
// ============================================

async function loadPeopleTab() {
  const container = document.getElementById('explore-posts-container');
  if (!container) return;

  container.innerHTML = skeletonCard(2);

  try {
    const res = await apiRequest('/users/suggested?limit=12').catch(() => null);
    let users = Array.isArray(res) ? res : (res?.users || []);

    if (!users.length) {
      users = [
        { _id: 'u1', name: 'Alazar Tesfay', username: 'alazar_dev', avatar: '', bio: 'Senior Fullstack Engineer & Open Source Enthusiast 🚀', isVerified: true },
        { _id: 'u2', name: 'Danait Berhane', username: 'danait_ui', avatar: '', bio: 'Product Designer & UI Specialist ✨', isVerified: true },
        { _id: 'u3', name: 'Freweyni Haile', username: 'freweyni_tech', avatar: '', bio: 'AI Researcher & Tech Columnist 🤖', isVerified: false },
        { _id: 'u4', name: 'Dawit Gebre', username: 'dawit_code', avatar: '', bio: 'TypeScript lover & Cloud Architect ☁️', isVerified: false },
      ];
    }

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'people-grid';

    users.forEach(user => {
      const card = document.createElement('div');
      card.className = 'creator-card';
      card.innerHTML = `
        <div class="creator-avatar">${avatarHTML(user, 'md')}</div>
        <div class="creator-name">${escapeHTML(user.name)} ${user.isVerified ? `<i class="fa-solid fa-circle-check" style="color:var(--primary);font-size:0.85rem;"></i>` : ''}</div>
        <div class="creator-username">@${escapeHTML(user.username)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.4;">${escapeHTML(user.bio || 'Community Creator')}</div>
        <button class="btn btn-primary btn-sm follow-creator-btn" style="width:100%;font-weight:700;">Follow</button>
      `;

      card.querySelector('.creator-name')?.addEventListener('click', () => {
        window.location.href = `profile.html?u=${user.username}`;
      });

      const btn = card.querySelector('.follow-creator-btn');
      btn?.addEventListener('click', async function(e) {
        e.stopPropagation();
        const currentlyFollowing = this.textContent.trim() === 'Following';
        const nextState = !currentlyFollowing;
        this.textContent = nextState ? 'Following' : 'Follow';
        this.className = `btn ${nextState ? 'btn-outline' : 'btn-primary'} btn-sm follow-creator-btn`;
        
        if (user._id && !user._id.startsWith('u')) {
          await apiRequest(`/users/${user._id}/follow`, { method: 'PUT' }).catch(() => {});
        }
        
        showToast(nextState ? `Following @${user.username}` : `Unfollowed @${user.username}`, 'success');
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  } catch {
    container.innerHTML = `<div class="card" style="text-align:center;padding:2rem;">Failed to load top creators.</div>`;
  }
}

// ============================================
// BUILD POST CARD (WITH CLEAN SINGLE ACTION ROW)
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

  let mediaHTML = '';
  if (post.video) {
    mediaHTML = `<div class="post-media" style="margin-top:0.75rem;"><video src="${post.video}" class="post-video" controls preload="metadata" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;"></video></div>`;
  } else if (post.image) {
    mediaHTML = `<div class="post-media" style="margin-top:0.75rem;"><img src="${post.image}" alt="Post media" class="post-image" loading="lazy" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;cursor:pointer;" /></div>`;
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
        <button class="action-btn delete-post-btn" title="Delete post" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      ` : ''}
    </div>

    <!-- Post Content with Entity Unescaping -->
    <div class="post-content" style="font-size:0.95rem;line-height:1.6;color:var(--text-main);">${renderContent(post.content)}</div>

    ${mediaHTML}

    <!-- Single Clean Action Row -->
    <div class="post-actions-row" style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border);">
      <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" title="Like" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:${isLiked ? 'var(--danger)' : 'var(--text-muted)'};font-weight:600;font-size:0.88rem;">
        <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        <span class="like-count">${post.likes?.length || 0}</span>
      </button>

      <button class="action-btn comment-btn" title="Comment" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--text-muted);font-weight:600;font-size:0.88rem;">
        <i class="fa-regular fa-comment"></i>
        <span class="comment-count">${post.comments?.length || 0}</span>
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

  // Event Listeners
  card.querySelector('.author-name')?.addEventListener('click', () => {
    window.location.href = `profile.html?u=${authorUsername}`;
  });

  card.querySelector('.like-btn')?.addEventListener('click', async () => {
    const btn = card.querySelector('.like-btn');
    try {
      const res = await apiRequest(`/posts/${post._id}/like`, { method: 'PUT' });
      btn.classList.toggle('liked', res.liked);
      btn.style.color = res.liked ? 'var(--danger)' : 'var(--text-muted)';
      const icon = btn.querySelector('i');
      if (icon) icon.className = res.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      const count = btn.querySelector('.like-count');
      if (count) count.textContent = res.likes;
    } catch (err) {
      showToast(err.message || 'Like failed', 'error');
    }
  });

  card.querySelector('.repost-btn')?.addEventListener('click', async () => {
    const btn = card.querySelector('.repost-btn');
    try {
      const res = await apiRequest(`/posts/${post._id}/repost`, { method: 'PUT' });
      btn.classList.toggle('reposted', res.reposted);
      btn.style.color = res.reposted ? 'var(--success)' : 'var(--text-muted)';
      const count = btn.querySelector('.repost-count');
      if (count) count.textContent = res.reposts;
      showToast(res.reposted ? 'Post reposted! 🔁' : 'Repost removed', 'success');
    } catch (err) {
      showToast(err.message || 'Repost failed', 'error');
    }
  });

  card.querySelector('.bookmark-btn')?.addEventListener('click', async () => {
    const btn = card.querySelector('.bookmark-btn');
    try {
      const res = await apiRequest(`/posts/${post._id}/bookmark`, { method: 'PUT' });
      btn.classList.toggle('bookmarked', res.bookmarked);
      btn.style.color = res.bookmarked ? 'var(--primary)' : 'var(--text-muted)';
      const icon = btn.querySelector('i');
      if (icon) icon.className = res.bookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
      showToast(res.bookmarked ? 'Saved to bookmarks 🔖' : 'Removed from bookmarks', 'success');
    } catch (err) {
      showToast(err.message || 'Bookmark failed', 'error');
    }
  });

  card.querySelector('.share-btn')?.addEventListener('click', () => {
    const url = `${window.location.origin}/post.html?id=${post._id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied! 📋', 'success'));
    } else {
      prompt('Copy post URL:', url);
    }
  });

  return card;
}

// ============================================
// CONTENT RENDERER WITH ENTITY DECODING
// ============================================

function renderContent(text) {
  if (!text) return '';
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const decoded = doc.body.textContent || text;

  let content = escapeHTML(decoded);

  content = content.replace(/#([a-zA-Z0-9_]+)/g, (match, tag) => {
    return `<a href="explore.html?tag=${encodeURIComponent(tag)}" class="hashtag-link" style="color:var(--primary);font-weight:600;text-decoration:none;">#${escapeHTML(tag)}</a>`;
  });

  content = content.replace(/@([a-zA-Z0-9_]+)/g, (match, username) => {
    return `<a href="profile.html?u=${encodeURIComponent(username)}" class="mention-link" style="color:var(--secondary);font-weight:600;text-decoration:none;">@${escapeHTML(username)}</a>`;
  });

  content = content.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
    return `<a href="${match}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;">${match}</a>`;
  });

  return content.replace(/\n/g, '<br>');
}

// ============================================
// HASHTAGS & SIDEBAR CREATORS
// ============================================

async function loadTrendingHashtags() {
  const container = document.getElementById('trending-tags');
  if (!container) return;

  try {
    const res = await apiRequest('/posts/hashtags/trending').catch(() => []);
    let tags = Array.isArray(res) ? res : (res?.tags || []);

    if (!tags.length) {
      tags = [
        { _id: 'ConnectHub2026', count: 1840 },
        { _id: 'WebDevelopment', count: 1420 },
        { _id: 'Glassmorphism', count: 950 },
        { _id: 'OpenSource', count: 620 },
      ];
    }

    container.innerHTML = '';
    tags.slice(0, 8).forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'hashtag-chip';
      chip.innerHTML = `
        <i class="fa-solid fa-hashtag" style="font-size:0.75rem;color:var(--primary);"></i>
        <span>${escapeHTML(t._id || t.tag)}</span>
        <span class="chip-count">${t.count || t.posts || 10}</span>
      `;
      chip.addEventListener('click', () => loadTagPosts(t._id || t.tag, chip));
      container.appendChild(chip);
    });

  } catch {
    container.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">Explore trending topics above.</div>`;
  }
}

function loadTagPosts(tag, chipEl) {
  document.querySelectorAll('.hashtag-chip').forEach(c => c.classList.remove('active'));
  if (chipEl) chipEl.classList.add('active');

  exploreState.activeTag = tag;
  loadExplorePosts(exploreState.activeTab);
}

async function loadPopularCreators() {
  const list = document.getElementById('popular-users');
  if (!list) return;

  try {
    const res = await apiRequest('/users/suggested?limit=4').catch(() => null);
    let users = Array.isArray(res) ? res : (res?.users || []);

    if (!users.length) {
      users = [
        { _id: 'p1', name: 'Alazar Tesfay', username: 'alazar_dev', avatar: '' },
        { _id: 'p2', name: 'Danait Berhane', username: 'danait_ui', avatar: '' },
        { _id: 'p3', name: 'Freweyni Haile', username: 'freweyni_tech', avatar: '' },
      ];
    }

    list.innerHTML = '';
    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'popular-user-item';
      item.innerHTML = `
        <div class="popular-user-info">
          ${avatarHTML(user, 'sm')}
          <div>
            <div class="popular-user-name">${escapeHTML(user.name)}</div>
            <div class="popular-user-username">@${escapeHTML(user.username)}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm follow-user-btn" style="padding:4px 12px;font-size:0.75rem;font-weight:700;">Follow</button>
      `;

      item.querySelector('.popular-user-info')?.addEventListener('click', () => {
        window.location.href = `profile.html?u=${user.username}`;
      });

      const btn = item.querySelector('.follow-user-btn');
      btn?.addEventListener('click', async function(e) {
        e.stopPropagation();
        const currentlyFollowing = this.textContent.trim() === 'Following';
        const nextState = !currentlyFollowing;
        this.textContent = nextState ? 'Following' : 'Follow';
        this.className = `btn ${nextState ? 'btn-outline' : 'btn-primary'} btn-sm follow-user-btn`;
        this.style.padding = '4px 12px';
        this.style.fontSize = '0.75rem';

        if (user._id && !user._id.startsWith('p')) {
          await apiRequest(`/users/${user._id}/follow`, { method: 'PUT' }).catch(() => {});
        }

        showToast(nextState ? `Following @${user.username}` : `Unfollowed @${user.username}`, 'success');
      });

      list.appendChild(item);
    });

  } catch {
    list.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">Explore creators on ConnectHub.</div>`;
  }
}

async function loadExploreStats() {
  const postsTodayEl = document.getElementById('stat-posts-today');
  const activeUsersEl = document.getElementById('stat-active-users');
  const trendingTagsEl = document.getElementById('stat-trending-tags');

  if (!postsTodayEl || !activeUsersEl || !trendingTagsEl) return;

  try {
    const res = await apiRequest('/posts/stats/explore').catch(() => null);
    if (res && res.success && res.stats) {
      postsTodayEl.textContent = Number(res.stats.postsToday).toLocaleString();
      activeUsersEl.textContent = Number(res.stats.activeUsers).toLocaleString();
      trendingTagsEl.textContent = Number(res.stats.trendingTags).toLocaleString();
    }
  } catch {
    // Keep baseline default counts
  }
}

console.log('✨ Glassmorphism Explore module initialized');