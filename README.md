<div align="center">

# ⚡ ConnectHub
### Modern Full-Stack Social Media Platform | Portfolio Project

[![Version](https://img.shields.io/badge/version-2.0.0-indigo.svg?style=for-the-badge&logo=appveyor)](https://github.com/tedrosweldegebriel465-eng/ConnectHub)
[![Stars](https://img.shields.io/github/stars/tedrosweldegebriel465-eng/ConnectHub?style=for-the-badge&logo=github)](https://github.com/tedrosweldegebriel465-eng/ConnectHub/stargazers)
[![Forks](https://img.shields.io/github/forks/tedrosweldegebriel465-eng/ConnectHub?style=for-the-badge&logo=github)](https://github.com/tedrosweldegebriel465-eng/ConnectHub/network/members)
[![Issues](https://img.shields.io/github/issues/tedrosweldegebriel465-eng/ConnectHub?style=for-the-badge&logo=github)](https://github.com/tedrosweldegebriel465-eng/ConnectHub/issues)
[![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.0-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>⚡ ConnectHub</b> is a state-of-the-art, full-stack social media platform and short-video sharing ecosystem built for modern web standards and <b>secure developer sandbox environments</b>.
  <br />
  Featuring seamless real-time social networking, dynamic feeds, multi-category safety moderation, age-gating compliance, and <b>ConnectClips</b> — a smooth, vertical TikTok-style short video experience.
</p>

[Live Demo](#-live-demo--repository) •
[Key Features](#-key-features) •
[Skills Demonstrated](#-skills-demonstrated) •
[Screenshots](#-screenshots--visual-tour) •
[Platform Structure](#-full-platform-directory-structure) •
[Architecture](#-system-architecture) •
[Quick Start](#-quick-start-guide) •
[Author](#-author--contact)

---

</div>

## 🌐 Live Demo & Repository

| Gateway | Link / Status |
| :--- | :--- |
| 🚀 **Live Application** | *Live demo coming soon* |
| 💻 **GitHub Repository** | [https://github.com/tedrosweldegebriel465-eng/ConnectHub](https://github.com/tedrosweldegebriel465-eng/ConnectHub) |

---

## 📖 Table of Contents
- [🌟 Key Features](#-key-features)
- [🎯 Skills Demonstrated](#-skills-demonstrated)
- [🖼️ Screenshots & Visual Tour](#-screenshots--visual-tour)
- [🍪 Interactive Cookie Consent & Micro-Animations](#-interactive-cookie-consent--micro-animations)
- [📂 Full Platform Directory Structure](#-full-platform-directory-structure)
- [🏗️ System Architecture](#-system-architecture)
- [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [⚙️ Environment Variables](#%EF%B8%8F-environment-variables)
- [📡 Core API Reference](#-core-api-reference)
- [☁ Cloud Deployment](#-cloud-deployment-guide)
- [🔮 Future Enhancements](#-future-enhancements--roadmap)
- [🛡️ Security & Sandbox Guardrails](#%EF%B8%8F-security--sandbox-guardrails)
- [👤 Author & Contact](#-author--contact)
- [🙏 Acknowledgements](#-acknowledgements)
- [📜 License](#-license)

---

## 🌟 Key Features

### 1. ⚡ ConnectClips Short-Video Feed
* **TikTok-Style Vertical Feed**: Fullscreen vertical video stream with responsive snap scrolling.
* **Intersection-Observer Autoplay**: Smart viewport detection that automatically plays active clips and pauses hidden ones to save bandwidth.
* **Interactive Overlay UI**: Modern glassmorphism overlay with like counters, interactive comments drawer, bookmarking, creator profile popups, sound mute/unmute toggle, and instant report triggers.

### 2. 📰 Dynamic Social Feed & Engagement
* **Rich Multi-Media Posts**: Create text posts, multi-image galleries, video embeds, and interactive real-time polls.
* **Multi-Reactions & Comments**: Express reactions (Like, Heart, Fire, Laugh, Support) and participate in threaded discussions.
* **24-Hour Stories**: Share temporary media clips and text updates with auto-expiration after 24 hours.

### 3. 💬 Real-Time Direct Messaging
* **Socket.IO Powered Chat**: Sub-millisecond instant messaging with online status indicators, unread notification badges, and real-time message delivery.
* **Saved Content & Bookmarks**: Save posts and media items for quick access in your personal library.

### 4. 🛡️ Hardened Security & Compliance
* **Invite-Only Registration**: Strictly controlled sign-ups requiring valid invite codes (`REGISTRATION_INVITE_CODES` or `ADMIN_INVITE_CODES`).
* **Compliance Age-Gating (13+)**: Mandatory age verification checkbox and DOB validation during account creation.
* **Password Encryption & JWT**: BCrypt password hashing (10 salt rounds) with secure JWT and HTTP-Only session cookies.
* **Centralized Moderation Queue**: Complete reporting pipeline (`/api/reports` & `/api/admin/reports`) allowing administrators to review, action, or dismiss safety reports.

---

## 🎯 Skills Demonstrated

* **REST API Architecture**: Enterprise RESTful endpoints built with Node.js & Express.js.
* **Authentication & Authorization**: Secure JWT token verification, session persistence, and role-based access control.
* **Security & Anti-Abuse**: BCrypt password hashing (10 salt rounds), Helmet HTTP security headers, Express rate limiting, and input sanitization.
* **MongoDB Data Modeling**: Relational-like Mongoose ODM schemas for Users, Posts, Comments, Messages, Stories, and Reports with optimized indexing and populate methods.
* **Real-Time Event Distribution**: Socket.IO bi-directional WebSocket event management for live messaging and active user status indicators.
* **Responsive UI/UX Engineering**: Glassmorphism design system built with Vanilla CSS (CSS Custom Properties, smooth dark/light mode toggle, micro-animations, and fluid typography).
* **Media Handling & File Pipelines**: FileReader API client previews, Multer middleware server pipeline, and HTML5 Video API controls.
* **Git Version Control & Deployment**: Production-ready documentation, structured code architecture, and multi-environment configuration.

---

## 🖼️ Screenshots & Visual Tour

Explore the high-fidelity UI and user experience across ConnectHub:

### 📱 1. Sign In & Registration Gating
> Secure authentication flow featuring invite code enforcement and 13+ age verification compliance.

| Sign In Screen | Account Registration Step 1 | Account Registration Step 2 |
| :---: | :---: | :---: |
| <img src="uploads/screenshots/signin.png" width="300" alt="Sign In Page" /> | <img src="uploads/screenshots/create%20account.png" width="300" alt="Create Account Step 1" /> | <img src="uploads/screenshots/create%20account1.png" width="300" alt="Create Account Step 2" /> |

---

### ⚡ 2. ConnectClips & Main Social Feed
> TikTok-style vertical short video experience alongside the interactive social newsfeed.

| ⚡ ConnectClips Short Videos | 📰 Main Social Feed |
| :---: | :---: |
| <img src="uploads/screenshots/ConnectClips.png" width="400" alt="ConnectClips Feed" /> | <img src="uploads/screenshots/Feed.png" width="400" alt="ConnectHub Feed" /> |

---

### 🔍 3. Explore, Real-Time Messages & User Profile
> Seamless discovery, direct messaging, saved posts, and comprehensive user profile management.

| 🔍 Explore & Discovery | 💬 Real-Time Direct Messaging |
| :---: | :---: |
| <img src="uploads/screenshots/Explore.png" width="400" alt="Explore Page" /> | <img src="uploads/screenshots/Messages.png" width="400" alt="Messages Page" /> |

| 🔖 Bookmarks & Saved Media | 👤 User Profile & Customization |
| :---: | :---: |
| <img src="uploads/screenshots/BookMarks.png" width="400" alt="Bookmarks Page" /> | <img src="uploads/screenshots/Profile.png" width="400" alt="Profile Page" /> |

---

## 🍪 Interactive Cookie Consent & Micro-Animations

ConnectHub features a single, custom-designed floating dark-mode Cookie Consent Banner with rich micro-animations:

* **Visual Design**: Sleek rounded pill shape with glassmorphism backdrop blur (`backdrop-filter: blur(16px)`), purple gradient lightning bolt badge, clear privacy disclosures, and glowing violet action button.
* **Success Animation**:
  1. Clicking `✓ Accept` triggers a smooth state transition.
  2. The button background morphs to vibrant emerald green (`#10b981`) with a radial glowing aura.
  3. The checkmark icon performs a spring scale pop animation (`checkPop`).
  4. Button text updates instantly to `✓ Accepted!`.
  5. A particle burst effect launches 14 colorful sparkles around the button.
  6. The banner smoothly slides down and fades out after an 800ms celebration delay.
* **Single Instance Enforcement**: Built-in duplicate detection purges any extra or unwanted banners so only one clean, functional consent banner exists in the DOM.
* **Persistent Preferences**: Consent state is persisted in `localStorage` (`connecthub_cookie_consent`) and HTTP cookies.
* **Testing & Reset**: Users can reset or re-test the animation anytime via the button on `privacy.html` or calling `window.ConnectHubCookieBanner.reset()`.

---

## 📂 Full Platform Directory Structure

```text
ConnectHub/
├── client/                     # Frontend Web Client Application
│   ├── css/                    # Modular Style System
│   │   ├── auth.css            # Authentication pages layout
│   │   ├── bookmarks.css       # Saved posts & bookmarks
│   │   ├── clips.css           # ConnectClips short video feed
│   │   ├── explore.css         # Discovery & trending layout
│   │   ├── feed.css            # Main social newsfeed layout
│   │   ├── icons.css           # SVG & FontAwesome icon utilities
│   │   ├── landing.css         # Landing page section styles
│   │   ├── messages.css        # Real-time chat layout
│   │   ├── post.css            # Post details & comments layout
│   │   ├── profile.css         # Profile customization layout
│   │   └── style.css           # Global design system, dark mode & animated cookie banner
│   ├── js/                     # Frontend Application Modules
│   │   ├── api.js              # Fetch wrapper & API client
│   │   ├── auth.js             # Auth state, validation & form handling
│   │   ├── bookmarks.js        # Bookmarks management
│   │   ├── clips.js            # Short video observer & player controller
│   │   ├── config.js           # Frontend global settings & constants
│   │   ├── cookie-banner.js    # Animated cookie consent banner & micro-interactions
│   │   ├── explore.js          # Search & category discovery engine
│   │   ├── feed.js             # Post rendering, reactions, polls & stories
│   │   ├── icons.js            # SVG icon component registry
│   │   ├── landing.js          # Landing page interactions & counters
│   │   ├── layout.js           # Shared navigation, footer & notifications
│   │   ├── messages.js         # Socket.IO real-time chat client
│   │   ├── post.js             # Threaded post & comments view
│   │   ├── profile.js          # Profile view, edit & user stats
│   │   └── utils.js            # Toast notifications, formatters & helper functions
│   ├── bookmarks.html          # Bookmarks & Saved Media Page
│   ├── clips.html              # ConnectClips TikTok-Style Video Feed Page
│   ├── explore.html            # Explore & Trending Discovery Page
│   ├── feed.html               # Main Social Feed Page
│   ├── help.html               # Help Center & Documentation Page
│   ├── index.html              # Landing Page & Marketing Portal
│   ├── login.html              # User Authentication Login Page
│   ├── post.html               # Single Post Detail & Comments Page
│   ├── privacy.html            # Privacy Policy & Cookie Preferences Page
│   ├── profile.html            # User Profile & Activity Page
│   ├── register.html           # Invite-only Registration & Age-gating Page
│   └── terms.html              # Terms of Service Page
├── server/                     # Backend Node.js & Express API Server
│   ├── config/                 # Database & JWT configuration
│   ├── controllers/            # REST API Request Controllers
│   │   ├── authController.js         # Registration, login & profile auth
│   │   ├── commentController.js      # Post comments CRUD
│   │   ├── messageController.js      # Direct messaging & chat history
│   │   ├── notificationController.js # Real-time user notification badges
│   │   ├── postController.js         # Posts, reactions, polls & media
│   │   ├── reportController.js       # Abuse & safety content reporting
│   │   ├── storyController.js        # 24-hour temporary stories
│   │   └── userController.js         # User profiles, follow & block
│   ├── middleware/             # Express Middleware Modules
│   │   ├── authMiddleware.js     # JWT verification & role authorization
│   │   ├── authValidation.js     # Request body payload validation
│   │   ├── errorMiddleware.js    # Global API error handler
│   │   ├── security.js           # Rate limiting & security headers
│   │   └── upload.js             # Multer file upload & storage handler
│   ├── models/                 # Mongoose Data Schemas
│   │   ├── comment.js            # Comment model & reply thread schema
│   │   ├── message.js            # Direct chat message schema
│   │   ├── notification.js       # User notification schema
│   │   ├── post.js               # Social post, poll & reaction schema
│   │   ├── report.js             # Content & user safety report schema
│   │   ├── story.js              # 24h story upload schema
│   │   └── user.js               # User account, credentials & settings schema
│   ├── routes/                 # API Endpoint Router Declarations
│   ├── seeders/                # Database Seeding Scripts
│   ├── services/               # Internal Services & Socket.IO Handler
│   ├── utils/                  # Backend Logger & Utility Functions
│   └── app.js                  # Main Express Server Entry Point
├── tests/                      # Automated Security & Integration Tests
│   ├── security.test.js        # Auth, JWT & Rate limiting tests
│   └── smoke.test.js           # API route & server health tests
├── uploads/                    # User Media & File Storage
│   └── screenshots/            # High-resolution application preview screenshots
├── .env.example                # Template for environment configuration
├── package.json                # Project dependencies & script definitions
└── README.md                   # Technical documentation & repository guide
```

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[📱 Web Client: HTML5 / Vanilla JS / CSS3 / Glassmorphism]
    
    subgraph Backend Infrastructure
        API[⚡ Express.js v5 REST API Gateway]
        Socket[💬 Socket.IO Real-Time Event Engine]
        Auth[🛡️ Security Layer: JWT / BCrypt / Helmet / Rate-Limiter]
    end
    
    subgraph Data & Storage
        DB[(🍃 MongoDB Database & Mongoose ODM)]
        GridFS[📁 Media Storage & File Upload System]
    end

    Client -->|HTTP / REST API| API
    Client <-->|WebSocket Events| Socket
    API --> Auth
    Auth --> DB
    API --> GridFS
```

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Custom Properties, Glassmorphism design system, smooth dark/light mode toggle, FontAwesome 6 icons, Inter & Plus Jakarta Sans typography).
* **Backend**: Node.js, Express.js (v5.0), Socket.IO (sub-millisecond real-time event distribution), Winston logging.
* **Database ODM**: MongoDB with Mongoose ODM (Schemas for `User`, `Post`, `Comment`, `Message`, `Report`).
* **Security & Auth**: BCrypt password hashing, JSON Web Tokens (JWT), Helmet HTTP security headers, Express Rate Limiting, Invite-code gating, COPPA 13+ age gating.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: `v16.0.0` or higher
* **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/connecthub_db`) or MongoDB Atlas URI string.

### 1. Clone the Repository
```bash
git clone https://github.com/tedrosweldegebriel465-eng/ConnectHub.git
cd ConnectHub
```

### 2. Environment Configuration
Copy `.env.example` to create your local `.env` configuration:
```bash
cp .env.example .env
```

Set up your environment variables inside `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/connecthub_db
JWT_SECRET=your_secure_random_jwt_secret_here
JWT_EXPIRES_IN=7d

# Access Control (Invite Codes)
REGISTRATION_INVITE_CODES=CONNECT2026,DEV2026,SANDBOX2026
ADMIN_INVITE_CODES=ADMIN2026_MASTER
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Demo Data
```bash
npm run seed
```

### 5. Launch the Server
```bash
# Development mode with Nodemon
npm run dev

# Production mode
npm start
```
The server will start on `http://localhost:5000`. You can open the client web application pages directly in any browser or serve them via a static web server.

---

## 📡 Core API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register new user with invite code & 13+ age verification | No |
| **POST** | `/api/auth/login` | Authenticate user and issue JWT session token | No |
| **GET** | `/api/auth/me` | Retrieve authenticated user profile | **Yes** |
| **GET** | `/api/posts` | Fetch paginated main social feed posts | **Yes** |
| **POST** | `/api/posts` | Create new text, media gallery, video, or poll post | **Yes** |
| **PUT** | `/api/posts/:id/like` | Toggle post reaction (Like, Heart, Fire, etc.) | **Yes** |
| **GET** | `/api/comments/:postId` | Retrieve comments for a specific post | **Yes** |
| **POST** | `/api/comments/:postId` | Submit a new comment | **Yes** |
| **POST** | `/api/reports` | Submit safety, abuse, or content violation report | **Yes** |
| **GET** | `/api/admin/reports` | Fetch pending moderation queue items | **Yes (Admin)** |

---

## 🔮 Future Enhancements & Roadmap

- 🔐 **OAuth 2.0 Integration**: Single Sign-On via Google and GitHub credentials.
- 🔔 **Web Push Notifications**: Service worker notifications for direct messages and post interactions.
- 🤖 **AI Content Moderation**: Machine learning powered safety scanning for uploaded media and text content.
- 📱 **Progressive Web App (PWA)**: Offline caching, service workers, and installable web manifest.
- 🎬 **HLS Video Transcoding**: Adaptive bitrate streaming and automated short video compression.
- 🔑 **Two-Factor Authentication (2FA)**: Time-based One-Time Password (TOTP) authenticator app support.

---

## 🛡️ Security & Sandbox Guardrails

⚡ **ConnectHub** is engineered with safety guardrails to serve as a high-fidelity, production-grade platform:
1. **Invite-Only Access**: Prevents unauthorized signups while permitting mentor-supervised onboarding.
2. **Standardized Glassmorphism Design System**: Demonstrates enterprise CSS variable architecture and clean component layout without relying on external heavy CSS utility frameworks.
3. **Safety & Moderation Pipeline**: Hands-on exposure to building real-world safety reporting, user restriction loops, and COPPA 13+ age gating.

---

## 👤 Author & Contact

<div align="center">

### **Tedros Weldegebriel**
*Full-Stack Software Engineer & Platform Developer*

[![Portfolio](https://img.shields.io/badge/Portfolio-Visit%20Site-7c3aed?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/tedrosweldegebriel465-eng)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/tedros-dev369)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github)](https://github.com/tedrosweldegebriel465-eng)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:teddastube@gmail.com)

</div>

---

## 🙏 Acknowledgements

- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/) & [Mongoose ODM](https://mongoosejs.com/)
- [Socket.IO](https://socket.io/)
- [Font Awesome Icons](https://fontawesome.com/)
- [Google Fonts](https://fonts.google.com/) (Inter & Plus Jakarta Sans)
- Open Source Developer Community

---

## 📜 License
Distributed under the **ISC License**. Designed for educational and portfolio demonstration.

Copyright © 2026 ⚡ **ConnectHub** by Tedros Weldegebriel. All rights reserved.
