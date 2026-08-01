(function () {
  const { origin, hostname, protocol } = window.location;
  const onAppServer = origin.includes(":5000") || hostname === "localhost";

  window.API_BASE_URL = onAppServer
    ? "/api"
    : `${protocol}//${hostname}:5000/api`;

  window.SOCKET_URL = onAppServer
    ? origin
    : `${protocol}//${hostname}:5000`;

  // Migrate legacy tokens from localStorage to sessionStorage (XSS mitigation)
  (function migrateLegacyAuth() {
    const legacyToken = localStorage.getItem("token");
    if (legacyToken && !sessionStorage.getItem("token")) {
      sessionStorage.setItem("token", legacyToken);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");

    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.user?._id) {
        localStorage.setItem("user", JSON.stringify(parsed.user));
        if (parsed.token && !sessionStorage.getItem("token")) {
          sessionStorage.setItem("token", parsed.token);
        }
      } else if (parsed?.token && parsed?._id) {
        const { token, refreshToken, ...userOnly } = parsed;
        localStorage.setItem("user", JSON.stringify(userOnly));
        if (token && !sessionStorage.getItem("token")) {
          sessionStorage.setItem("token", token);
        }
      }
    } catch {
      /* ignore */
    }
  })();

  window.AuthStorage = {
    setSession(token, user) {
      if (token) sessionStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));
      localStorage.removeItem("token");
    },
    getToken() {
      return sessionStorage.getItem("token");
    },
    getUser() {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    },
    clear() {
      sessionStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    },
    isAuthenticated() {
      return !!(this.getToken() && this.getUser());
    },
  };

  window.requireAuth = function requireAuth(redirectMessage) {
    if (window.AuthStorage.isAuthenticated()) {
      document.documentElement.classList.add("ready");
      return true;
    }
    if (redirectMessage) {
      sessionStorage.setItem("redirectMessage", redirectMessage);
    }
    window.location.replace("login.html");
    return false;
  };

  window.redirectIfAuthed = function redirectIfAuthed() {
    if (window.AuthStorage.isAuthenticated()) {
      window.location.replace("feed.html");
      return true;
    }
    document.documentElement.classList.add("ready");
    return false;
  };

  // Cookie / local storage consent banner
  window.initCookieConsent = function initCookieConsent() {
    if (localStorage.getItem("cookieConsent")) return;

    if (!document.getElementById("cookie-consent-styles")) {
      const style = document.createElement("style");
      style.id = "cookie-consent-styles";
      style.innerHTML = `
        @keyframes cookieSlideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 40px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes cookieSlideDown {
          from {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, 40px) scale(0.94);
          }
        }
        .cookie-banner-anim {
          animation: cookieSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .cookie-banner-exit {
          animation: cookieSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
        #cookie-consent-banner,
        #cookie-consent-banner * {
          box-sizing: border-box;
        }
        #cookie-consent-banner p {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          opacity: 1 !important;
          font-size: 0.88rem !important;
          font-weight: 500 !important;
          line-height: 1.45 !important;
          margin: 0 !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.6) !important;
        }
        #cookie-consent-banner a {
          color: #a5b4fc !important;
          -webkit-text-fill-color: #a5b4fc !important;
          font-weight: 700 !important;
          text-decoration: underline !important;
          margin-left: 3px !important;
        }
        #cookie-consent-banner a:hover {
          color: #c7d2fe !important;
          -webkit-text-fill-color: #c7d2fe !important;
        }
      `;
      document.head.appendChild(style);
    }

    const banner = document.createElement("div");
    banner.id = "cookie-consent-banner";
    banner.className = "cookie-banner-anim";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie notice");
    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3)); border: 1px solid rgba(99,102,241,0.5); color: #a5b4fc; flex-shrink: 0; font-size: 1.1rem;">
          ⚡
        </span>
        <p>
          ConnectHub uses essential cookies & local storage for authentication and theme preferences.
          <a href="privacy.html">Privacy Policy</a>
        </p>
      </div>
      <button type="button" id="cookie-consent-accept" style="
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.55rem 1.35rem;
        border-radius: 22px;
        border: none;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #ffffff !important;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        flex-shrink: 0;
      ">
        <i class="fa-solid fa-check" style="font-size: 0.85em;"></i> Accept
      </button>
    `;

    Object.assign(banner.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "99999",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1.25rem",
      width: "calc(100% - 32px)",
      maxWidth: "620px",
      padding: "0.85rem 1.25rem",
      background: "rgba(15, 15, 23, 0.96)",
      backdropFilter: "blur(16px)",
      webkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "16px",
      boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6), 0 0 2px rgba(99, 102, 241, 0.5)",
      color: "#ffffff",
    });

    document.body.appendChild(banner);

    const btn = document.getElementById("cookie-consent-accept");
    if (btn) {
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "scale(1.05)";
        btn.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.6)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "0 4px 14px rgba(79, 70, 229, 0.4)";
      });
      btn.addEventListener("click", () => {
        localStorage.setItem("cookieConsent", "accepted");
        banner.classList.remove("cookie-banner-anim");
        banner.classList.add("cookie-banner-exit");
        setTimeout(() => banner.remove(), 300);
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.initCookieConsent();
    });
  } else {
    window.initCookieConsent();
  }
})();
