/**
 * ============================================
 * ⚡ CONNECTHUB - CONNECTCLIPS (SHORT-VIDEO LOGIC)
 * Version: 2.0.0
 * Description: Interactive TikTok-style vertical short video controller
 * ============================================
 */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initClipsApp();
  });
} else {
  initClipsApp();
}

const DEMO_CLIPS = [
  {
    id: 'clip_story_1',
    videoUrl: '/uploads/stories/6a6cc27dd0ef2bd77ca6c438-1785517446944-967428559.mp4',
    creator: {
      name: 'Yohannes Gebre',
      username: 'yohannes_gebre',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yohannes_gebre',
    },
    caption: 'Cinematic Story Reel on ConnectClips! ⚡ Check out the smooth playback from uploads/stories 🇪🇹 #ConnectHub #Tigray #Cinematic',
    audioTitle: 'Original Audio - Yohannes Gebre',
    likesCount: 24500,
    commentsCount: 680,
    sharesCount: 1490,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    comments: [
      { user: 'Alazar', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alazar', text: 'This story clip looks incredible! 🔥' },
      { user: 'Senait_Dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Senait', text: 'ConnectClips video playback is so crisp 🚀' },
      { user: 'Kibrom', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kibrom', text: 'Love the ultra cinematic vibes!' }
    ]
  },
  {
    id: 'clip_story_2',
    videoUrl: '/uploads/stories/6a6cc27dd0ef2bd77ca6c438-1785518254265-785106186.mp4',
    creator: {
      name: 'Luul Letebirhan',
      username: 'luul_letebirhan',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luul_letebirhan',
    },
    caption: 'Ultra-cinematic motion story #2 🎥⚡ Drop a ⚡ if you like this video! #ConnectClips #Visuals #Film',
    audioTitle: 'Cinematic Soundscape - Luul Letebirhan',
    likesCount: 31200,
    commentsCount: 940,
    sharesCount: 1820,
    isLiked: true,
    isBookmarked: true,
    isFollowing: true,
    comments: [
      { user: 'Freweyni', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Freweyni', text: 'Super impressive video feature!' }
    ]
  },
  {
    id: 'clip_story_3',
    videoUrl: '/uploads/stories/Create_a_second_ultra_cinem.mp4',
    creator: {
      name: 'Freweyni Haile',
      username: 'freweyni_motion',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=freweyni_motion',
    },
    caption: 'Ultra Cinematic Stories & ConnectClips 🎬✨ #ConnectHub #Creative #ConnectClips',
    audioTitle: 'Synthwave Beats - Freweyni Haile',
    likesCount: 42100,
    commentsCount: 1250,
    sharesCount: 2900,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    comments: [
      { user: 'Teklit', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teklit', text: 'Top tier video quality 💯' }
    ]
  },
  {
    id: 'clip_server_1',
    videoUrl: '/uploads/1783687397913-330478517.mp4',
    creator: {
      name: 'Alazar Tesfay',
      username: 'alazar_tech',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alazar_tech',
    },
    caption: 'Uploaded ConnectClip demo video 💻⚡ #ConnectHub #Tech #Demo',
    audioTitle: 'Original Audio - Alazar Tesfay',
    likesCount: 15400,
    commentsCount: 420,
    sharesCount: 980,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    comments: [
      { user: 'Yohannes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yohannes', text: 'ConnectClips is full-featured now! ⚡' }
    ]
  },
  {
    id: 'clip_1',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-arm-working-in-a-lab-43187-large.mp4',
    creator: {
      name: 'Alazar Tesfay',
      username: 'alazar_tech',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alazar_tech',
    },
    caption: 'Building the future with AI & Robotics! ⚡ What feature do you want next on ConnectHub? #ConnectHub #Innovation #Tech',
    audioTitle: 'Original Audio - Alazar Tesfay',
    likesCount: 14280,
    commentsCount: 342,
    sharesCount: 890,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    comments: [
      { user: 'Alazar', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alazar', text: 'This looks insane! 🔥' },
      { user: 'Senait_Dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Senait', text: 'ConnectHub short video feed is super smooth 🚀' },
      { user: 'Kibrom', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kibrom', text: 'Love the new dark mode aesthetics!' },
    ]
  },
  {
    id: 'clip_2',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-at-night-with-neon-lights-42864-large.mp4',
    creator: {
      name: 'Freweyni Haile',
      username: 'freweyni_motion',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=freweyni_motion',
    },
    caption: 'Neon vibes in the city tonight 🌃 Drop a ⚡ if you love night citywalks! #Cyberpunk #CityLights #ConnectHub',
    audioTitle: 'Synthwave Nightfall - Freweyni Haile',
    likesCount: 28400,
    commentsCount: 915,
    sharesCount: 1420,
    isLiked: true,
    isBookmarked: true,
    isFollowing: true,
    comments: [
      { user: 'Freweyni', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Freweyni', text: 'Where was this taken? Stunning quality!' },
      { user: 'Teklit', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teklit', text: 'Aesthetics on point 💯' },
    ]
  },
  {
    id: 'clip_3',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-fast-on-a-laptop-keyboard-41372-large.mp4',
    creator: {
      name: 'Kibrom Medhane',
      username: 'kibrom_code',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kibrom_code',
    },
    caption: 'Late night coding session shipping full-stack platform features 💻⚡ #FullStack #NodeJS #JavaScript',
    audioTitle: 'Lo-Fi Beats to Code - Kibrom Medhane',
    likesCount: 9540,
    commentsCount: 188,
    sharesCount: 310,
    isLiked: false,
    isBookmarked: false,
    isFollowing: false,
    comments: [
      { user: 'Yemane', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yemane', text: 'Keep grinding brother! ✊' },
    ]
  }
];

let globalMuted = true;
let activeCommentClipId = null;

async function initClipsApp() {
  document.documentElement.classList.add('ready');
  const container = document.getElementById('clips-container');
  if (!container) return;

  // Render initial fallback clips immediately to prevent empty/black screen
  renderClips(container);
  setupScrollIntersection();

  try {
    if (typeof apiRequest === 'function') {
      const res = await apiRequest('/posts/clips').catch(() => null);
      if (res && res.clips && res.clips.length) {
        const user = window.getCurrentUser ? getCurrentUser() : null;
        const dynamicClips = res.clips.map((post) => ({
          id: `clip_${post._id}`,
          postId: post._id,
          videoUrl: post.video,
          creator: {
            name: post.author?.name || 'ConnectHub Creator',
            username: post.author?.username || 'creator',
            avatar: post.author?.avatar || 'images/avatar.png',
          },
          caption: post.content || '⚡ ConnectClips short video',
          audioTitle: `Original Audio - ${post.author?.name || 'ConnectHub'}`,
          likesCount: post.likes?.length || 0,
          commentsCount: post.commentCount || 0,
          sharesCount: post.repostCount || 0,
          isLiked: user ? post.likes?.includes(user._id) : false,
          isBookmarked: user ? post.bookmarks?.includes(user._id) : false,
          isFollowing: false,
          comments: [],
        }));
        
        // Merge unique clips
        dynamicClips.forEach(dc => {
          if (!DEMO_CLIPS.some(c => c.id === dc.id)) {
            DEMO_CLIPS.unshift(dc);
          }
        });

        // Re-render with merged clips
        renderClips(container);
        setupScrollIntersection();
      }
    }
  } catch (e) {
    console.warn('Backend clips fetch fallback:', e);
  }
}

function renderClips(container) {
  container.innerHTML = DEMO_CLIPS.map(clip => `
    <div class="clip-card" id="${clip.id}" data-id="${clip.id}">
      <video class="clip-video" src="${clip.videoUrl}" loop ${globalMuted ? 'muted' : ''} playsinline></video>

      <!-- Play Overlay -->
      <div class="clip-play-overlay">
        <i class="fa-solid fa-play"></i>
      </div>

      <!-- Top Overlay -->
      <div class="clip-top-overlay">
        <div class="clip-badge">
          <i class="fa-solid fa-bolt"></i> CONNECTCLIPS
        </div>
        <button class="clip-sound-btn" onclick="toggleMute('${clip.id}')" aria-label="Sound Toggle">
          <i class="fa-solid ${globalMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
        </button>
      </div>

      <!-- Right Action Sidebar -->
      <div class="clip-action-sidebar">
        <button class="clip-action-btn ${clip.isLiked ? 'liked' : ''}" onclick="toggleLike('${clip.id}')">
          <div class="clip-action-icon-wrap">
            <i class="fa-solid fa-heart"></i>
          </div>
          <span class="clip-action-count" id="likes-${clip.id}">${formatNumber(clip.likesCount)}</span>
        </button>

        <button class="clip-action-btn" onclick="openComments('${clip.id}')">
          <div class="clip-action-icon-wrap">
            <i class="fa-solid fa-comment-dots"></i>
          </div>
          <span class="clip-action-count">${formatNumber(clip.commentsCount)}</span>
        </button>

        <button class="clip-action-btn ${clip.isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${clip.id}')">
          <div class="clip-action-icon-wrap">
            <i class="fa-solid fa-bookmark"></i>
          </div>
          <span class="clip-action-count">Save</span>
        </button>

        <button class="clip-action-btn" onclick="shareClip('${clip.id}')">
          <div class="clip-action-icon-wrap">
            <i class="fa-solid fa-paper-plane"></i>
          </div>
          <span class="clip-action-count">${formatNumber(clip.sharesCount)}</span>
        </button>

        <button class="clip-action-btn" onclick="reportClip('${clip.id}')">
          <div class="clip-action-icon-wrap">
            <i class="fa-solid fa-flag"></i>
          </div>
          <span class="clip-action-count">Report</span>
        </button>

        <div class="clip-disc">
          <img src="${clip.creator.avatar}" alt="Audio" />
        </div>
      </div>

      <!-- Bottom Info Overlay -->
      <div class="clip-info-overlay">
        <div class="clip-creator-row">
          <img src="${clip.creator.avatar}" class="clip-creator-avatar" alt="${clip.creator.name}" />
          <span class="clip-creator-name">@${clip.creator.username}</span>
          <button class="clip-follow-btn ${clip.isFollowing ? 'following' : ''}" onclick="toggleFollow('${clip.id}')">
            ${clip.isFollowing ? 'Following' : '+ Follow'}
          </button>
        </div>
        <p class="clip-caption">${clip.caption}</p>
        <div class="clip-audio-track">
          <i class="fa-solid fa-music"></i>
          <span>${clip.audioTitle}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Attach video click event for play/pause
  container.querySelectorAll('.clip-card').forEach(card => {
    const video = card.querySelector('.clip-video');
    const playOverlay = card.querySelector('.clip-play-overlay');

    video.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playOverlay.classList.remove('active');
      } else {
        video.pause();
        playOverlay.classList.add('active');
      }
    });
  });
}

function setupScrollIntersection() {
  const cards = document.querySelectorAll('.clip-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector('.clip-video');
      const playOverlay = entry.target.querySelector('.clip-play-overlay');
      if (entry.isIntersecting) {
        video.muted = globalMuted;
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            playOverlay.classList.remove('active');
          }).catch(err => {
            // Autoplay was prevented; show play overlay so user can tap to play
            playOverlay.classList.add('active');
          });
        }
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.3 });

  cards.forEach(card => observer.observe(card));
}

function toggleMute(clipId) {
  globalMuted = !globalMuted;
  document.querySelectorAll('.clip-video').forEach(vid => {
    vid.muted = globalMuted;
  });
  document.querySelectorAll('.clip-sound-btn i').forEach(icon => {
    icon.className = `fa-solid ${globalMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
  });
}

function toggleLike(clipId) {
  const clip = DEMO_CLIPS.find(c => c.id === clipId);
  if (!clip) return;
  clip.isLiked = !clip.isLiked;
  clip.likesCount += clip.isLiked ? 1 : -1;

  const btn = document.querySelector(`#${clipId} .clip-action-btn:nth-child(1)`);
  const countSpan = document.getElementById(`likes-${clipId}`);
  if (btn) btn.classList.toggle('liked', clip.isLiked);
  if (countSpan) countSpan.textContent = formatNumber(clip.likesCount);

  if (window.showToast) {
    window.showToast(clip.isLiked ? 'Liked clip! ❤️' : 'Unliked clip', 'info');
  }
}

function toggleBookmark(clipId) {
  const clip = DEMO_CLIPS.find(c => c.id === clipId);
  if (!clip) return;
  clip.isBookmarked = !clip.isBookmarked;

  const btn = document.querySelector(`#${clipId} .clip-action-btn:nth-child(3)`);
  if (btn) btn.classList.toggle('bookmarked', clip.isBookmarked);

  if (window.showToast) {
    window.showToast(clip.isBookmarked ? 'Saved to bookmarks 🔖' : 'Removed from bookmarks', 'info');
  }
}

function toggleFollow(clipId) {
  const clip = DEMO_CLIPS.find(c => c.id === clipId);
  if (!clip) return;
  clip.isFollowing = !clip.isFollowing;

  const btn = document.querySelector(`#${clipId} .clip-follow-btn`);
  if (btn) {
    btn.classList.toggle('following', clip.isFollowing);
    btn.textContent = clip.isFollowing ? 'Following' : '+ Follow';
  }

  if (window.showToast) {
    window.showToast(clip.isFollowing ? `Following @${clip.creator.username}` : `Unfollowed @${clip.creator.username}`, 'success');
  }
}

function shareClip(clipId) {
  const clip = DEMO_CLIPS.find(c => c.id === clipId);
  clip.sharesCount += 1;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    if (window.showToast) window.showToast('Clip link copied to clipboard! 🚀', 'success');
  } else {
    if (window.showToast) window.showToast('Clip shared successfully! 🚀', 'success');
  }
}

function reportClip(clipId) {
  const clip = DEMO_CLIPS.find((c) => c.id === clipId);
  if (!clip) return;

  const category = prompt(
    'Report this clip:\n\nspam | harassment | hate_speech | nsfw | misinformation | violence | other\n\nEnter category:'
  );
  if (!category) return;

  const allowed = [
    'spam', 'harassment', 'hate_speech', 'nsfw', 'misinformation',
    'impersonation', 'copyright', 'privacy', 'self_harm', 'violence', 'other',
  ];
  const normalized = category.trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    if (window.showToast) window.showToast('Invalid report category', 'error');
    return;
  }

  const reason = prompt('Optional details (5+ characters):') || normalized;
  if (reason.length < 5) {
    if (window.showToast) window.showToast('Please provide at least 5 characters', 'error');
    return;
  }

  if (clip.postId && typeof apiRequest === 'function') {
    apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'post',
        targetId: clip.postId,
        category: normalized,
        reason: reason.slice(0, 500),
      }),
    })
      .then(() => {
        if (window.showToast) {
          window.showToast('Clip reported. Our moderation team will review it.', 'success');
        }
      })
      .catch((err) => {
        if (window.showToast) window.showToast(err.message || 'Failed to submit report', 'error');
      });
    return;
  }

  if (window.showToast) {
    window.showToast(
      'Demo clip flagged for review. Live clips from the feed use the full moderation pipeline.',
      'success'
    );
  }
}

function openComments(clipId) {
  activeCommentClipId = clipId;
  const clip = DEMO_CLIPS.find(c => c.id === clipId);
  const modal = document.getElementById('clips-comments-modal');
  const list = document.getElementById('clips-comments-list');
  if (!modal || !list) return;

  list.innerHTML = clip.comments.map(c => `
    <div class="clip-comment-item">
      <img src="${c.avatar}" class="clip-comment-avatar" alt="${c.user}" />
      <div class="clip-comment-body">
        <div class="clip-comment-user">@${c.user}</div>
        <div class="clip-comment-text">${c.text}</div>
      </div>
    </div>
  `).join('');

  modal.classList.add('open');
}

function closeComments() {
  const modal = document.getElementById('clips-comments-modal');
  if (modal) modal.classList.remove('open');
}

function postClipComment() {
  const input = document.getElementById('clips-comment-input');
  if (!input || !input.value.trim() || !activeCommentClipId) return;

  const clip = DEMO_CLIPS.find(c => c.id === activeCommentClipId);
  const text = input.value.trim();
  clip.comments.push({
    user: 'You',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
    text
  });
  clip.commentsCount += 1;
  input.value = '';
  openComments(activeCommentClipId);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
