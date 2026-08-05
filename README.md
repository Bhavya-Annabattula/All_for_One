# All for One

An all-in-one Chrome extension that combines a website security scanner, a page-aware AI chatbot (RAG-based), and a floating on-page AI buddy.

## Features

- **Security Scan** — Analyzes the current page for signs of AI-generated content, scams/fraud, misinformation, and clickbait. Displays a verdict, risk scores, and specific findings.
- **AI Chatbot (RAG)** — Ask questions about the page you're currently viewing. The extension reads the page content and sends it along with your question to a backend LLM for a contextual answer.
- **Tech X-ray** *(in progress)* — Placeholder panel intended to detect the technologies/frameworks used on a page.
- **Floating AI Buddy** — An optional animated cat avatar that follows your cursor on the page. Click it to open the chat side panel.

## Project Structure

```
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — handles RAG queries, opens side panel
├── content.js           # Injected into every page — extracts page text, renders floating avatar
├── popup.html / popup.js       # Toolbar popup UI — security scan, X-ray, avatar toggle
├── sidepanel.html / sidepanel.js  # Chat side panel UI
└── backend/             # Flask backend (Groq LLaMA3-70B) — see backend/README.md
```

## How It Works

1. **Content script** (`content.js`) runs on every page, extracting clean readable text (stripping scripts, nav, footer, etc.) and exposing it via `chrome.runtime` messages.
2. **Popup** (`popup.js`) lets you trigger a security scan, which sends the page's URL/title/text to the backend's `/security-scan` endpoint and renders the structured result.
3. **Side panel** (`sidepanel.js` / `background.js`) lets you ask questions about the page. The question and page text are sent to the backend's `/rag-query` endpoint.
4. **Backend** (Flask + Groq LLaMA3-70B) processes both requests and returns structured/plain-text responses. See `backend/README.md` for setup and deployment.

## Installation (Load Unpacked)

1. Clone this repo.
2. Go to `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the repo folder.
5. Pin the extension from the toolbar for easy access.

## Backend Setup

The extension depends on a Flask backend for the security scan and chat features. See [`backend/README.md`](./backend/README.md) for setup, environment variables, and deployment instructions.

The backend is deployed on Render at:

```
https://all-for-one-r4jy.onrender.com
```

Both `background.js` and `popup.js` are configured to use this URL via a `BACKEND_URL` constant.

⚠️ **Render free tier note:** the backend spins down after ~15 minutes of inactivity. The first request after idle time can take 20–50 seconds to respond while the service cold-starts. If a scan or chat query seems stuck on the first try, wait a few seconds and try again.

## Permissions

- `storage` — persists avatar toggle state
- `activeTab` / `scripting` — reads content from the current tab
- `sidePanel` — powers the chat UI
- `<all_urls>` — content script needs to run on any page for the security scan and chat features

## Roadmap

- [x] Deploy backend to Render and unify `BACKEND_URL` across `background.js` and `popup.js`
- [ ] Implement Tech X-ray detection logic
- [ ] Persist chat history in the side panel across sessions

## Tech Stack

- **Frontend:** Chrome Extension (Manifest V3), vanilla JS
- **Backend:** Flask, Groq (LLaMA3-70B), `flask-cors`
- **Deployment:** Render
