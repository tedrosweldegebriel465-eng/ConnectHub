/* post.js — single post detail page. Depends on utils.js */
const currentUser = getCurrentUser();

const params = new URLSearchParams(window.location.search);
const postId = params.get("id");
if (!postId) window.location.replace("feed.html");

if (document.getElementById("profile-link"))
  document.getElementById("profile-link").href = `profile.html?u=${currentUser.username}`;

// ===== Load Post =====
async function loadPost() {
  const container = document.getElementById("post-detail-container");
  try {
    const res = await fetch(`${API}/posts/${postId}`, { headers: authHeaders() });
    if (res.status === 401) { window.location.replace("login.html"); return; }
    if (!res.ok) { container.innerHTML = `<div class="loading">Post not found.</div>`; return; }
    const post = await res.json();
    document.title = `${post.author.name} on ⚡ ConnectHub`;
    container.innerHTML = "";
    container.appendChild(buildDetailCard(post));
    loadComments();
  } catch {
    container.innerHTML = `<div class="loading">Failed to load post.</div>`;
  }
}

function buildDetailCard(post) {
  const isOwner = post.author._id === currentUser._id;
  const isLiked = post.likes.includes(currentUser._id);
  const isBookmarked = post.bookmarks && post.bookmarks.includes(currentUser._id);
  const isReposted = post.reposts && post.reposts.includes(currentUser._id);
  const displayAuthor = post.isRepost && post.originalPost ? post.originalPost.author : post.author;

  const card = document.createElement("div");
  card.className = "card post-card";

  const mediaHTML = post.video
    ? `<video src="${post.video}" class="post-video" controls></video>`
    : post.image ? `<img src="${post.image}" class="post-image" alt="post" />` : "";

  const pollHTML = post.isPoll ? buildPollHTML(post) : "";
  const editedHTML = post.edited ? `<span class="edited-label">(edited)</span>` : "";

  const heartSVG = isLiked
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;

  const bookmarkSVG = isBookmarked
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

  card.innerHTML = `
    ${post.isRepost ? `<div class="repost-label"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> ${escapeHTML(post.author.name)} reposted</div>` : ""}
    <div class="post-header">
      ${avatarHTML(displayAuthor)}
      <div class="post-author-info">
        <span class="author-name" data-username="${displayAuthor.username}">${escapeHTML(displayAuthor.name)}</span>
        <div class="post-time">${timeAgo(post.createdAt)} ${editedHTML}</div>
      </div>
      ${isOwner ? `
        <button class="action-btn" id="edit-post-btn" title="Edit post">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete-post-btn" title="Delete post">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>` : ""}
    </div>
    <div class="post-content" id="post-content-text">${renderContent(post.content)}</div>
    ${mediaHTML}
    ${pollHTML}
    <div class="post-stats">
      <span class="view-count">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        ${post.views || 0} views
      </span>
      &nbsp;·&nbsp; ${post.likes.length} likes
    </div>
    <div class="post-actions">
      <button class="action-btn like-btn ${isLiked ? "liked" : ""}">
        ${heartSVG} <span class="like-count">${post.likes.length}</span>
      </button>
      <button class="action-btn repost-btn ${isReposted ? "reposted" : ""}">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        <span>${(post.reposts || []).length}</span>
      </button>
      <button class="action-btn bookmark-btn ${isBookmarked ? "bookmarked" : ""}">
        ${bookmarkSVG}
      </button>
      <button class="action-btn share-btn" title="Copy link">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </button>
    </div>
    <div class="edit-area hidden" id="edit-area">
      <textarea id="edit-textarea" maxlength="500" rows="3">${escapeHTML(post.content)}</textarea>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
        <button class="btn btn-primary btn-sm" id="save-edit-btn">Save</button>
        <button class="btn btn-outline btn-sm" id="cancel-edit-btn">Cancel</button>
      </div>
    </div>`;

  card.querySelector(".author-name").addEventListener("click", () => {
    window.location.href = `profile.html?u=${displayAuthor.username}`;
  });
  if (post.image) card.querySelector(".post-image")?.addEventListener("click", () => openLightbox(post.image));
  card.querySelector(".like-btn").addEventListener("click", () => toggleLike(post, card));
  card.querySelector(".repost-btn").addEventListener("click", () => toggleRepost(post._id, card));
  card.querySelector(".bookmark-btn").addEventListener("click", () => toggleBookmark(post._id, card));
  card.querySelector(".share-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast("Link copied!", "success"))
      .catch(() => showToast("Could not copy", "error"));
  });
  if (isOwner) {
    card.querySelector(".delete-post-btn").addEventListener("click", () => deletePost(post._id));
    card.querySelector("#edit-post-btn").addEventListener("click", () => {
      card.querySelector("#edit-area").classList.toggle("hidden");
    });
    card.querySelector("#save-edit-btn").addEventListener("click", async () => {
      const newContent = card.querySelector("#edit-textarea").value.trim();
      if (!newContent) return;
      try {
        const res = await fetch(`${API}/posts/${post._id}/edit`, {
          method: "PUT", headers: authHeaders(), body: JSON.stringify({ content: newContent }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        card.querySelector("#post-content-text").innerHTML = renderContent(data.content);
        post.content = data.content;
        card.querySelector("#edit-area").classList.add("hidden");
        card.querySelector("#edit-textarea").value = data.content;
        showToast("Post updated!", "success");
      } catch (err) { showToast(err.message, "error"); }
    });
    card.querySelector("#cancel-edit-btn").addEventListener("click", () => {
      card.querySelector("#edit-area").classList.add("hidden");
    });
  }
  if (post.isPoll) {
    card.querySelectorAll(".poll-option-btn").forEach((btn, i) => {
      btn.addEventListener("click", () => votePoll(post._id, i, card));
    });
  }
  return card;
}

function buildPollHTML(post) {
  const totalVotes = post.pollOptions.reduce((s, o) => s + o.votes.length, 0);
  const ended = post.pollEndsAt && new Date() > new Date(post.pollEndsAt);
  const userVoted = post.pollOptions.some((o) => o.votes.includes(currentUser._id));
  return `<div class="poll-container">
    ${post.pollOptions.map((opt, i) => {
      const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
      const voted = opt.votes.includes(currentUser._id);
      return `<button class="poll-option-btn ${voted ? "voted" : ""}" data-index="${i}" ${ended || userVoted ? "disabled" : ""}>
        <span class="poll-option-text">${escapeHTML(opt.text)}</span>
        ${userVoted || ended ? `<span class="poll-option-pct">${pct}%</span><div class="poll-bar" style="width:${pct}%"></div>` : ""}
      </button>`;
    }).join("")}
    <div class="poll-meta">${totalVotes} vote${totalVotes !== 1 ? "s" : ""}${ended ? " · Ended" : ""}</div>
  </div>`;
}

function renderContent(text) {
  return escapeHTML(text)
    .replace(/#([a-zA-Z0-9_]+)/g, '<a href="explore.html?tag=$1" class="hashtag-link">#$1</a>')
    .replace(/@([a-zA-Z0-9_]+)/g, '<a href="profile.html?u=$1" class="mention-link">@$1</a>');
}

async function toggleLike(post, card) {
  try {
    const res = await fetch(`${API}/posts/${post._id}/like`, { method: "PUT", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const btn = card.querySelector(".like-btn");
    btn.classList.toggle("liked", data.liked);
    const heartSVG = data.liked
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
    btn.innerHTML = `${heartSVG} <span class="like-count">${data.likes}</span>`;
  } catch (err) { showToast(err.message, "error"); }
}

async function toggleRepost(postId, card) {
  try {
    const res = await fetch(`${API}/posts/${postId}/repost`, { method: "PUT", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const btn = card.querySelector(".repost-btn");
    btn.classList.toggle("reposted", data.reposted);
    btn.querySelector("span").textContent = data.reposts;
    showToast(data.reposted ? "Reposted!" : "Repost removed", "success");
  } catch (err) { showToast(err.message, "error"); }
}

async function toggleBookmark(postId, card) {
  try {
    const res = await fetch(`${API}/posts/${postId}/bookmark`, { method: "PUT", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const btn = card.querySelector(".bookmark-btn");
    btn.classList.toggle("bookmarked", data.bookmarked);
    btn.innerHTML = data.bookmarked
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    showToast(data.bookmarked ? "Saved" : "Removed from bookmarks", "success");
  } catch (err) { showToast(err.message, "error"); }
}

async function votePoll(postId, optionIndex, card) {
  try {
    const res = await fetch(`${API}/posts/${postId}/poll/${optionIndex}`, { method: "PUT", headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const total = data.pollOptions.reduce((s, o) => s + o.votes, 0);
    card.querySelectorAll(".poll-option-btn").forEach((btn, i) => {
      const pct = total ? Math.round((data.pollOptions[i].votes / total) * 100) : 0;
      btn.disabled = true;
      btn.innerHTML = `<span class="poll-option-text">${btn.querySelector(".poll-option-text").textContent}</span><span class="poll-option-pct">${pct}%</span><div class="poll-bar" style="width:${pct}%"></div>`;
    });
    card.querySelector(".poll-meta").textContent = `${total} vote${total !== 1 ? "s" : ""}`;
    showToast("Vote recorded!", "success");
  } catch (err) { showToast(err.message, "error"); }
}

async function deletePost(postId) {
  if (!confirm("Delete this post?")) return;
  try {
    const res = await fetch(`${API}/posts/${postId}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
    showToast("Post deleted", "success");
    setTimeout(() => window.location.href = "feed.html", 800);
  } catch (err) { showToast(err.message, "error"); }
}

// ===== Comments =====
async function loadComments() {
  const list = document.getElementById("comments-list");
  list.innerHTML = `<div class="loading">Loading comments...</div>`;
  try {
    const res = await fetch(`${API}/comments/${postId}`, { headers: authHeaders() });
    const comments = await res.json();
    list.innerHTML = "";
    if (!comments.length) { list.innerHTML = `<div class="loading">No comments yet.</div>`; return; }
    comments.forEach((c) => list.appendChild(buildCommentItem(c)));
  } catch { list.innerHTML = `<div class="loading">Failed to load comments.</div>`; }
}

function buildCommentItem(comment) {
  const isOwner = comment.author._id === currentUser._id;
  const isLiked = comment.likes && comment.likes.includes(currentUser._id);
  const item = document.createElement("div");
  item.className = "comment-item";
  item.innerHTML = `
    ${avatarHTML(comment.author)}
    <div class="comment-body">
      <span class="comment-author">${escapeHTML(comment.author.name)}</span>
      <div class="comment-text">${escapeHTML(comment.content)}</div>
      <div class="comment-meta">
        <span class="comment-time">${timeAgo(comment.createdAt)}</span>
        <button class="comment-like-btn ${isLiked ? "liked" : ""}">
          ${isLiked
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`}
          <span>${(comment.likes || []).length}</span>
        </button>
        ${isOwner ? `<button class="comment-delete">Delete</button>` : ""}
      </div>
    </div>`;
  item.querySelector(".comment-like-btn").addEventListener("click", async () => {
    const res = await fetch(`${API}/comments/${comment._id}/like`, { method: "PUT", headers: authHeaders() });
    const data = await res.json();
    const btn = item.querySelector(".comment-like-btn");
    btn.classList.toggle("liked", data.liked);
    btn.querySelector("span").textContent = data.likes;
  });
  if (isOwner) {
    item.querySelector(".comment-delete").addEventListener("click", async () => {
      try {
        await fetch(`${API}/comments/${comment._id}`, { method: "DELETE", headers: authHeaders() });
        item.remove();
        showToast("Comment deleted", "success");
      } catch { /* ignore */ }
    });
  }
  return item;
}

document.getElementById("submit-comment")?.addEventListener("click", submitComment);
document.getElementById("comment-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitComment();
});

async function submitComment() {
  const input = document.getElementById("comment-input");
  const content = input?.value.trim();
  if (!content) return;
  try {
    const res = await fetch(`${API}/comments/${postId}`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    input.value = "";
    const list = document.getElementById("comments-list");
    const noComment = list.querySelector(".loading");
    if (noComment) noComment.remove();
    list.appendChild(buildCommentItem(data));
    list.scrollTop = list.scrollHeight;
  } catch (err) { showToast(err.message, "error"); }
}

// Init
loadPost();
initReportModal();

function initReportModal() {
  const reportBtn = document.getElementById("report-post-btn");
  const reportModal = document.getElementById("report-modal");
  const closeBtn = document.getElementById("close-report-modal");
  const reportForm = document.getElementById("report-form");
  const descInput = document.getElementById("report-description");
  const descCount = document.getElementById("report-desc-count");

  if (!reportBtn || !reportModal || !reportForm) return;

  reportBtn.addEventListener("click", () => {
    reportModal.classList.remove("hidden");
  });

  closeBtn?.addEventListener("click", () => reportModal.classList.add("hidden"));
  reportModal.querySelector(".modal-overlay")?.addEventListener("click", () => {
    reportModal.classList.add("hidden");
  });

  descInput?.addEventListener("input", () => {
    if (descCount) descCount.textContent = descInput.value.length;
  });

  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const category = document.getElementById("report-reason").value;
    const description = descInput?.value.trim() || category;

    if (!category) {
      showToast("Please select a reason", "error");
      return;
    }

    const reason = description.length >= 5 ? description : `${category}: ${description}`;

    try {
      await apiRequest("/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType: "post",
          targetId: postId,
          category,
          reason: reason.slice(0, 500),
        }),
      });
      reportModal.classList.add("hidden");
      reportForm.reset();
      if (descCount) descCount.textContent = "0";
      showToast("Report submitted. Thank you for helping keep the community safe.", "success");
    } catch (err) {
      showToast(err.message || "Failed to submit report", "error");
    }
  });
}
