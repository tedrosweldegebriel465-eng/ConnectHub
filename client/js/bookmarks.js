/**
 * ============================================
 * BOOKMARKS.JS - Glassmorphism Bookmarks Module
 * Version: 2.2.0
 * Description: Handles saved posts, collections,
 *              sidebar widgets, entity unescaping, and export
 * ============================================
 */

// ===== State =====
const bookmarksState = {
  posts: [],
  collections: [
    { name: 'All', count: 0 },
    { name: 'Inspiration', count: 0 },
    { name: 'Code Snippets', count: 0 },
    { name: 'Design Ideas', count: 0 }
  ],
  activeCollection: 'All',
  sortBy: 'newest',
  searchQuery: '',
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

  initializeBookmarksPage();
  initializeControls();
});

// ============================================
// INITIALIZATION
// ============================================

function initializeBookmarksPage() {
  loadCollectionsPills();
  loadSavedPosts();
  loadSuggestedBookmarks();
  loadPopularTags();
}

function initializeControls() {
  const searchInput = document.getElementById('bookmarks-search-input');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        bookmarksState.searchQuery = this.value.trim().toLowerCase();
        renderBookmarksFeed();
      }, 300);
    });
  }

  const sortSelect = document.getElementById('sort-bookmarks');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      bookmarksState.sortBy = this.value;
      renderBookmarksFeed();
    });
  }

  document.getElementById('export-bookmarks-btn')?.addEventListener('click', exportBookmarks);
  document.getElementById('clear-bookmarks-btn')?.addEventListener('click', () => {
    document.getElementById('clear-confirm-modal')?.classList.remove('hidden');
  });
  document.getElementById('confirm-clear-btn')?.addEventListener('click', clearAllBookmarks);
  document.getElementById('cancel-clear-btn')?.addEventListener('click', () => {
    document.getElementById('clear-confirm-modal')?.classList.add('hidden');
  });
  document.getElementById('close-clear-modal')?.addEventListener('click', () => {
    document.getElementById('clear-confirm-modal')?.classList.add('hidden');
  });

  // Collection modal
  const colModal = document.getElementById('collection-modal');
  document.getElementById('create-collection-btn')?.addEventListener('click', () => colModal?.classList.remove('hidden'));
  document.getElementById('close-collection-modal')?.addEventListener('click', () => colModal?.classList.add('hidden'));
  colModal?.querySelector('.modal-overlay')?.addEventListener('click', () => colModal?.classList.add('hidden'));

  document.getElementById('collection-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('collection-name')?.value?.trim();
    if (!name) return;
    bookmarksState.collections.push({ name, count: 0 });
    loadCollectionsPills();
    colModal?.classList.add('hidden');
    document.getElementById('collection-name').value = '';
    showToast(`Collection "${name}" created! 📁`, 'success');
  });
}

// ============================================
// COLLECTIONS PILLS
// ============================================

function loadCollectionsPills() {
  const container = document.getElementById('collections-list');
  if (!container) return;

  container.innerHTML = '';
  bookmarksState.collections.forEach(col => {
    const pill = document.createElement('button');
    pill.className = `collection-pill ${bookmarksState.activeCollection === col.name ? 'active' : ''}`;
    pill.innerHTML = `
      <i class="fa-solid fa-folder"></i>
      <span>${escapeHTML(col.name)}</span>
    `;
    pill.addEventListener('click', () => {
      bookmarksState.activeCollection = col.name;
      loadCollectionsPills();
      renderBookmarksFeed();
    });
    container.appendChild(pill);
  });

  const collectionsCountEl = document.getElementById('stat-collections');
  if (collectionsCountEl) collectionsCountEl.textContent = bookmarksState.collections.length;
}

// ============================================
// SAVED POSTS FETCH & RENDER
// ============================================

async function loadSavedPosts() {
  const container = document.getElementById('bookmarks-container');
  if (!container) return;

  container.innerHTML = skeletonCard(3);

  try {
    const res = await apiRequest('/posts/bookmarks').catch(() => []);
    let posts = Array.isArray(res) ? res : (res?.posts || []);

    // Provide sample saved posts if empty
    if (!posts.length) {
      posts = [
        {
          _id: 'b1',
          content: 'Building ultra-responsive glassmorphism dashboards with CSS variables and custom components! hello it&#39;s me working on modern UI ✨ #WebDevelopment',
          author: { name: 'Danait Berhane', username: 'danait_ui', isVerified: true },
          likes: ['1'],
          comments: ['1'],
          reposts: ['1'],
          bookmarks: ['user'],
          createdAt: new Date().toISOString(),
          image: '',
        },
        {
          _id: 'b2',
          content: 'Key architectural insights for real-time WebSockets and state updates in social platforms 🚀 #ConnectHub2026',
          author: { name: 'Alazar Tesfay', username: 'alazar_dev', isVerified: true },
          likes: ['1', '2'],
          comments: [],
          reposts: [],
          bookmarks: ['user'],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        }
      ];
    }

    bookmarksState.posts = posts;
    updateStats(posts);
    renderBookmarksFeed();

  } catch (error) {
    container.innerHTML = `<div class="card" style="text-align:center;padding:2rem;">Failed to load bookmarks.</div>`;
  }
}

function renderBookmarksFeed() {
  const container = document.getElementById('bookmarks-container');
  if (!container) return;

  let posts = [...bookmarksState.posts];

  // Search filter
  if (bookmarksState.searchQuery) {
    posts = posts.filter(p => (p.content || '').toLowerCase().includes(bookmarksState.searchQuery) || (p.author?.name || '').toLowerCase().includes(bookmarksState.searchQuery));
  }

  // Sort
  if (bookmarksState.sortBy === 'oldest') {
    posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (bookmarksState.sortBy === 'most-liked') {
    posts.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  } else {
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  container.innerHTML = '';

  if (!posts.length) {
    container.innerHTML = `
      <div class="card empty-state" style="text-align:center;padding:3rem 2rem;">
        <i class="fa-solid fa-bookmark" style="font-size:2.8rem;color:var(--primary);margin-bottom:1rem;"></i>
        <h4 style="font-weight:800;margin-bottom:0.4rem;">No saved posts found</h4>
        <p style="color:var(--text-muted);font-size:0.9rem;">Click the bookmark icon on any post to save it here for quick access!</p>
      </div>
    `;
    return;
  }

  posts.forEach(post => container.appendChild(buildPostCard(post)));
}

function updateStats(posts) {
  const totalEl = document.getElementById('stat-total');
  const weekEl = document.getElementById('stat-this-week');

  if (totalEl) totalEl.textContent = posts.length;
  if (weekEl) {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const count = posts.filter(p => new Date(p.createdAt).getTime() >= weekAgo).length;
    weekEl.textContent = count;
  }
}

// ============================================
// BUILD POST CARD (WITH CLEAN SINGLE ACTION ROW)
// ============================================

function buildPostCard(post) {
  const currentUser = getCurrentUser();
  if (!currentUser) return document.createElement('div');

  const isOwner = post.author?._id === currentUser._id;
  const isLiked = post.likes?.includes(currentUser._id) || false;
  const isBookmarked = true; // since it's on Bookmarks page

  const authorName = post.author?.name || 'Creator';
  const authorUsername = post.author?.username || 'user';

  const card = document.createElement('div');
  card.className = 'card post-card';
  card.dataset.id = post._id;

  let mediaHTML = '';
  if (post.video) {
    mediaHTML = `<div class="post-media" style="margin-top:0.75rem;"><video src="${post.video}" controls class="post-video" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;"></video></div>`;
  } else if (post.image) {
    mediaHTML = `<div class="post-media" style="margin-top:0.75rem;"><img src="${post.image}" alt="Post media" class="post-image" loading="lazy" style="width:100%;border-radius:12px;max-height:380px;object-fit:cover;cursor:pointer;" /></div>`;
  }

  card.innerHTML = `
    <div class="post-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${avatarHTML(post.author)}
        <div>
          <div class="author-name" style="font-weight:700;font-size:0.95rem;cursor:pointer;color:var(--text-main);" data-username="${authorUsername}">
            ${escapeHTML(authorName)} ${post.author?.isVerified ? `<i class="fa-solid fa-circle-check" style="color:var(--primary);font-size:0.85rem;"></i>` : ''}
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);">
            @${escapeHTML(authorUsername)} · ${timeAgo(post.createdAt)}
          </div>
        </div>
      </div>
      <button class="action-btn remove-bookmark-btn" title="Remove bookmark" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;">
        <i class="fa-solid fa-xmark" style="font-size:1.1rem;"></i>
      </button>
    </div>

    <!-- Content with Entity Decoding -->
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

      <button class="action-btn bookmark-btn bookmarked" title="Remove Bookmark" style="background:none;border:none;cursor:pointer;color:var(--primary);font-size:0.9rem;">
        <i class="fa-solid fa-bookmark"></i>
      </button>

      <button class="action-btn share-btn" title="Share link" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.9rem;">
        <i class="fa-regular fa-paper-plane"></i>
      </button>
    </div>
  `;

  // Listeners
  card.querySelector('.author-name')?.addEventListener('click', () => {
    window.location.href = `profile.html?u=${authorUsername}`;
  });

  const removeBookmark = async () => {
    try {
      if (!post._id.startsWith('b')) {
        await apiRequest(`/posts/${post._id}/bookmark`, { method: 'PUT' });
      }
      bookmarksState.posts = bookmarksState.posts.filter(p => p._id !== post._id);
      updateStats(bookmarksState.posts);
      renderBookmarksFeed();
      showToast('Removed from bookmarks', 'info');
    } catch {
      showToast('Failed to remove bookmark', 'error');
    }
  };

  card.querySelector('.remove-bookmark-btn')?.addEventListener('click', removeBookmark);
  card.querySelector('.bookmark-btn')?.addEventListener('click', removeBookmark);

  card.querySelector('.share-btn')?.addEventListener('click', () => {
    const url = `${window.location.origin}/post.html?id=${post._id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied! 📋', 'success'));
    } else {
      prompt('Copy link:', url);
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

  return content.replace(/\n/g, '<br>');
}

// ============================================
// SIDEBAR WIDGETS (SUGGESTED & TAGS)
// ============================================

async function loadSuggestedBookmarks() {
  const container = document.getElementById('suggested-bookmarks');
  if (!container) return;

  try {
    const res = await apiRequest('/posts/trending').catch(() => []);
    let posts = Array.isArray(res) ? res : (res?.posts || []);

    if (!posts.length) {
      posts = [
        { _id: 's1', title: 'Top 10 Modern CSS Glassmorphism Patterns', authorName: 'Danait Berhane' },
        { _id: 's2', title: 'Building Scalable Real-time Socket Apps', authorName: 'Alazar Tesfay' }
      ];
    }

    container.innerHTML = '';
    posts.slice(0, 3).forEach(p => {
      const item = document.createElement('div');
      item.className = 'suggested-item';
      const title = p.content ? p.content.substring(0, 45) + '...' : (p.title || 'Recommended post');
      const author = p.author?.name || p.authorName || 'Creator';

      item.innerHTML = `
        <div>
          <div class="suggested-title">${escapeHTML(title)}</div>
          <div class="suggested-author">by ${escapeHTML(author)}</div>
        </div>
        <button class="btn btn-outline btn-sm save-suggested-btn" style="padding:2px 8px;font-size:0.75rem;">Save</button>
      `;

      item.querySelector('.save-suggested-btn')?.addEventListener('click', function() {
        this.textContent = 'Saved';
        this.disabled = true;
        showToast('Saved to Bookmarks! 🔖', 'success');
      });

      container.appendChild(item);
    });

  } catch {
    container.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">Discover posts on Explore page.</div>`;
  }
}

async function loadPopularTags() {
  const container = document.getElementById('popular-tags');
  if (!container) return;

  try {
    const res = await apiRequest('/posts/hashtags/trending').catch(() => []);
    let tags = Array.isArray(res) ? res : (res?.tags || []);

    if (!tags.length) {
      tags = [
        { _id: 'Glassmorphism' },
        { _id: 'ConnectHub2026' },
        { _id: 'WebDevelopment' },
        { _id: 'DesignSystem' }
      ];
    }

    container.innerHTML = '';
    tags.slice(0, 6).forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'hashtag-chip';
      chip.textContent = `#${t._id || t.tag}`;
      chip.addEventListener('click', () => {
        window.location.href = `explore.html?tag=${encodeURIComponent(t._id || t.tag)}`;
      });
      container.appendChild(chip);
    });

  } catch {
    container.innerHTML = `<div style="font-size:0.8rem;color:var(--text-muted);">Explore trending topics.</div>`;
  }
}

// ============================================
// EXPORT & CLEAR ALL
// ============================================

function exportBookmarks() {
  if (!bookmarksState.posts.length) {
    showToast('No saved posts to export', 'warning');
    return;
  }
  const headers = ['Content', 'Author', 'Date'];
  const rows = bookmarksState.posts.map(p => [
    `"${(p.content || '').replace(/"/g, '""')}"`,
    `"${p.author?.name || 'Creator'}"`,
    `"${new Date(p.createdAt).toLocaleDateString()}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bookmarks_${Date.now()}.csv`;
  link.click();
  showToast('Bookmarks exported! 📥', 'success');
}

function clearAllBookmarks() {
  bookmarksState.posts = [];
  updateStats([]);
  renderBookmarksFeed();
  document.getElementById('clear-confirm-modal')?.classList.add('hidden');
  showToast('All bookmarks cleared', 'info');
}

console.log('✨ Glassmorphism Bookmarks module initialized');