/**
 * ============================================
 * COOKIE-BANNER.JS - ConnectHub Cookie Consent
 * Version: 2.0.0
 * Description: Self-contained Animated Cookie Consent Banner
 *              with micro-animations, particle bursts & persistence.
 * ============================================
 */

(function () {
  'use strict';

  const CONSENT_KEY = 'connecthub_cookie_consent';

  /**
   * Dynamically injects CSS styles into <head> to ensure banner looks
   * pixel-perfect regardless of which stylesheet the parent page loads.
   */
  function injectStyles() {
    if (document.getElementById('connecthub-cookie-styles')) return;

    const style = document.createElement('style');
    style.id = 'connecthub-cookie-styles';
    style.textContent = `
      .cookie-banner-wrap {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(0);
        z-index: 10000;
        width: calc(100% - 32px);
        max-width: 820px;
        background: rgba(13, 14, 23, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50px;
        padding: 10px 18px 10px 16px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.65), 0 0 30px rgba(124, 58, 237, 0.25);
        opacity: 1;
        transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, box-shadow 0.3s ease;
        animation: cookieBannerSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes cookieBannerSlideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(60px) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
      }

      .cookie-banner-wrap.hiding {
        opacity: 0;
        transform: translateX(-50%) translateY(50px) scale(0.95);
        pointer-events: none;
      }

      .cookie-banner-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .cookie-banner-icon {
        width: 40px;
        height: 40px;
        min-width: 40px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #5b21b6, #2e1065);
        border: 1px solid rgba(167, 139, 250, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ff9d00;
        font-size: 16px;
        box-shadow: 0 0 14px rgba(255, 157, 0, 0.35);
        animation: iconPulse 3s infinite ease-in-out;
      }

      @keyframes iconPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); box-shadow: 0 0 20px rgba(255, 157, 0, 0.5); }
      }

      .cookie-banner-text {
        flex: 1;
        color: #f1f5f9;
        font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 0.9rem;
        line-height: 1.45;
        font-weight: 400;
        margin: 0;
      }

      .cookie-privacy-link {
        color: #ffffff;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: color 0.2s ease, text-shadow 0.2s ease;
      }

      .cookie-privacy-link:hover {
        color: #c4b5fd;
        text-shadow: 0 0 8px rgba(196, 181, 253, 0.6);
      }

      .cookie-accept-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 26px;
        border-radius: 9999px;
        border: none;
        background: linear-gradient(135deg, #7c3aed, #6366f1);
        color: #ffffff;
        font-family: inherit;
        font-size: 0.92rem;
        font-weight: 600;
        cursor: pointer;
        outline: none;
        white-space: nowrap;
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.5);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
      }

      .cookie-accept-btn:hover {
        transform: translateY(-1px) scale(1.04);
        box-shadow: 0 6px 26px rgba(124, 58, 237, 0.65);
        background: linear-gradient(135deg, #8b5cf6, #4f46e5);
      }

      .cookie-accept-btn:active {
        transform: translateY(0) scale(0.97);
      }

      /* SUCCESS ANIMATION STATE */
      .cookie-accept-btn.success {
        background: linear-gradient(135deg, #10b981, #059669) !important;
        box-shadow: 0 0 28px rgba(16, 185, 129, 0.7) !important;
        transform: scale(1.05);
        animation: btnSuccessPulse 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .cookie-accept-btn.success .btn-check-icon {
        display: inline-block;
        animation: checkPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }

      @keyframes btnSuccessPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.12); }
        100% { transform: scale(1.05); }
      }

      @keyframes checkPop {
        0% { transform: scale(0.5) rotate(-20deg); opacity: 0; }
        70% { transform: scale(1.35) rotate(10deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }

      .cookie-particle {
        position: fixed;
        pointer-events: none;
        border-radius: 50%;
        z-index: 10001;
        animation: particleBurst 0.75s ease-out forwards;
      }

      @keyframes particleBurst {
        0% { opacity: 1; transform: translate(0, 0) scale(1); }
        100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
      }

      @media (max-width: 640px) {
        .cookie-banner-wrap {
          bottom: 16px;
          width: calc(100% - 24px);
          border-radius: 24px;
          padding: 12px 16px;
        }
        .cookie-banner-content {
          flex-wrap: wrap;
          gap: 12px;
        }
        .cookie-banner-text {
          font-size: 0.84rem;
        }
        .cookie-accept-btn {
          width: 100%;
          justify-content: center;
          padding: 11px 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Spawns particle burst animation on button success
   * @param {HTMLElement} btn - Accept button element
   */
  function triggerParticleBurst(btn) {
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const colors = ['#10b981', '#34d399', '#a7f3d0', '#6366f1', '#c4b5fd', '#fbbf24'];

    for (let i = 0; i < 14; i++) {
      const particle = document.createElement('div');
      particle.className = 'cookie-particle';

      const size = Math.floor(Math.random() * 6) + 5;
      const angle = (i / 14) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
      const distance = Math.floor(Math.random() * 40) + 30;

      const dx = `${Math.cos(angle) * distance}px`;
      const dy = `${Math.sin(angle) * distance}px`;

      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.setProperty('--dx', dx);
      particle.style.setProperty('--dy', dy);

      document.body.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 750);
    }
  }

  /**
   * Renders and attaches the Cookie Banner
   */
  function initCookieBanner(forceShow = false) {
    injectStyles();

    // Purge any duplicate or unwanted cookie banners from the document
    const existingBanners = document.querySelectorAll('.cookie-banner-wrap, #connecthub-cookie-banner, #cookie-banner, .cookie-notice');
    if (existingBanners.length > 1) {
      existingBanners.forEach((el, idx) => {
        if (idx > 0) el.remove();
      });
    }

    // Check if user already accepted (unless forceShow is requested)
    const hasAccepted = localStorage.getItem(CONSENT_KEY) === 'accepted';
    if (hasAccepted && !forceShow) {
      document.querySelectorAll('.cookie-banner-wrap, #connecthub-cookie-banner').forEach(el => el.remove());
      return;
    }

    // Check if single banner already exists in DOM
    let bannerEl = document.getElementById('connecthub-cookie-banner');
    if (bannerEl) {
      bannerEl.classList.remove('hiding');
      bannerEl.style.display = 'block';
      return;
    }

    // Build Banner HTML
    bannerEl = document.createElement('div');
    bannerEl.id = 'connecthub-cookie-banner';
    bannerEl.className = 'cookie-banner-wrap';
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-label', 'Cookie Consent Notice');

    bannerEl.innerHTML = `
      <div class="cookie-banner-content">
        <div class="cookie-banner-icon">
          <i class="fa-solid fa-bolt">⚡</i>
        </div>
        <p class="cookie-banner-text">
          ConnectHub uses essential cookies &amp; local storage for authentication and theme preferences. 
          <a href="privacy.html" class="cookie-privacy-link">Privacy Policy</a>
        </p>
        <button type="button" id="cookie-accept-btn" class="cookie-accept-btn" aria-label="Accept essential cookies">
          <span class="btn-check-icon">✓</span>
          <span class="btn-text">Accept</span>
        </button>
      </div>
    `;

    document.body.appendChild(bannerEl);

    // Attach click handler for Accept button
    const acceptBtn = bannerEl.querySelector('#cookie-accept-btn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        if (acceptBtn.classList.contains('success')) return;

        // 1. Success Animation State
        acceptBtn.classList.add('success');
        const btnText = acceptBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Accepted!';

        // 2. Particle burst effect
        triggerParticleBurst(acceptBtn);

        // 3. Persist Consent
        try {
          localStorage.setItem(CONSENT_KEY, 'accepted');
          document.cookie = `${CONSENT_KEY}=accepted; max-age=31536000; path=/; SameSite=Lax`;
        } catch (e) {
          console.warn('Unable to persist cookie consent to localStorage:', e);
        }

        // 4. Smooth Fade/Slide Out after delay
        setTimeout(() => {
          bannerEl.classList.add('hiding');
          setTimeout(() => {
            if (bannerEl && bannerEl.parentNode) {
              bannerEl.style.display = 'none';
            }
          }, 450);
        }, 800);
      });
    }
  }

  /**
   * Reset consent and re-show banner
   */
  function resetCookieConsent() {
    localStorage.removeItem(CONSENT_KEY);
    document.cookie = `${CONSENT_KEY}=; max-age=0; path=/`;
    initCookieBanner(true);
  }

  // Expose globally
  window.ConnectHubCookieBanner = {
    init: initCookieBanner,
    reset: resetCookieConsent,
    show: function () { initCookieBanner(true); }
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initCookieBanner();
    });
  } else {
    initCookieBanner();
  }
})();
