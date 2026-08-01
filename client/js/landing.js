/**
 * landing.js — Landing page interactions
 * Handles: counter animation, scroll reveal,
 *          theme toggle, learn-more, stat counting
 */

// ===== Theme toggle =====
(function () {
  const btn = document.getElementById("theme-btn");
  const icon = document.getElementById("theme-icon");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (!icon) return;
    if (theme === "dark") {
      // Sun icon
      icon.className = "";
      icon.innerHTML = "";
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "18"); svg.setAttribute("height", "18");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
      icon.parentNode.innerHTML = "";
      btn.innerHTML = "";
      btn.appendChild(svg);
    } else {
      // Moon icon
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }

  // Set initial icon correctly
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(currentTheme);

  if (btn) {
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }
})();

// ===== Animated number counter =====
function animateCounter(el, target, duration = 2000) {
  const start = performance.now();
  const startVal = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(startVal + eased * target);

    // Format with + suffix and commas
    if (target >= 1000) {
      el.textContent = (current >= 1000 ? (current / 1000).toFixed(0) + "K+" : current.toLocaleString());
    } else {
      el.textContent = current + "+";
    }

    if (progress < 1) requestAnimationFrame(update);
    else {
      // Final value
      if (target >= 1000) {
        el.textContent = (target / 1000).toFixed(0) + "K+";
      } else {
        el.textContent = target + "+";
      }
    }
  }

  requestAnimationFrame(update);
}

// ===== Intersection Observer for scroll-triggered effects =====
function initScrollReveal() {
  // Counter animation — trigger when stats scroll into view
  const statsSection = document.querySelector(".landing-stats");
  if (statsSection) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.querySelectorAll(".stat-number[data-count]").forEach((el) => {
              const target = parseInt(el.dataset.count, 10);
              animateCounter(el, target);
            });
            counterObserver.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    counterObserver.observe(statsSection);
  }

  // Feature cards — fade in on scroll
  const featureCards = document.querySelectorAll(".feature-card");
  if (featureCards.length) {
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = "running";
            cardObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    featureCards.forEach((card) => {
      card.style.animationPlayState = "paused";
      cardObserver.observe(card);
    });
  }

  // Step cards — fade in on scroll
  const stepCards = document.querySelectorAll(".step-card");
  if (stepCards.length) {
    const stepObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.style.transition = "opacity 0.5s ease, transform 0.5s ease";
              entry.target.style.opacity = "1";
              entry.target.style.transform = "translateY(0)";
            }, i * 150);
            stepObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    stepCards.forEach((card) => stepObserver.observe(card));
  }

  // Testimonial cards — fade in on scroll
  const testCards = document.querySelectorAll(".testimonial-card");
  if (testCards.length) {
    const testObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.style.opacity = "1";
              entry.target.style.transform = "translateY(0)";
            }, i * 100);
            testObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    testCards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(24px)";
      card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      testObserver.observe(card);
    });
  }
}

// ===== Smooth scroll for "Learn More" =====
function initLearnMore() {
  const btn = document.getElementById("learn-more-btn");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById("how-it-works") || document.querySelector(".landing-features-section");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ===== Navbar scroll effect =====
function initNavScroll() {
  const nav = document.querySelector(".landing-nav");
  if (!nav) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      nav.style.boxShadow = "0 2px 20px rgba(0,0,0,0.1)";
    } else {
      nav.style.boxShadow = "none";
    }
  }, { passive: true });
}

// ===== Hero card pulse (make them more alive) =====
function initHeroCards() {
  const cards = document.querySelectorAll(".hero-card");
  cards.forEach((card, i) => {
    // Stagger entrance
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = card.classList.contains("hero-card-3")
        ? "translateY(-50%)"
        : "translateY(0)";
    }, 600 + i * 200);
  });
}

// ===== Toast from session storage (e.g. "Welcome back") =====
function initSessionToast() {
  const msg = sessionStorage.getItem("toastMessage");
  const type = sessionStorage.getItem("toastType") || "info";
  if (msg && typeof showToast === "function") {
    sessionStorage.removeItem("toastMessage");
    sessionStorage.removeItem("toastType");
    setTimeout(() => showToast(msg, type), 500);
  }
}

// ===== Typewriter effect for hero headline =====
function initTypewriter() {
  const words = ["real-time", "a new way", "the future"];
  const el = document.querySelector(".gradient-text");
  if (!el) return;
  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function type() {
    const word = words[wordIndex];
    if (!deleting) {
      el.textContent = word.substring(0, charIndex + 1);
      charIndex++;
      if (charIndex === word.length) {
        deleting = true;
        setTimeout(type, 2000); // pause before delete
        return;
      }
    } else {
      el.textContent = word.substring(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
      }
    }
    setTimeout(type, deleting ? 60 : 100);
  }

  // Start after a short delay
  setTimeout(type, 1500);
}

// ===== Init all =====
document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initLearnMore();
  initNavScroll();
  initHeroCards();
  initSessionToast();
  initTypewriter();
});
