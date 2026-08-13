# All for One

An all-in-one Chrome extension that combines a website security scanner, a full technology fingerprinting tool, a page-aware AI chatbot (RAG-based, with PDF support), and a floating on-page AI buddy.

## Features

- **Security Scan** — Analyzes the current page for signs of AI-generated content, scams/fraud, misinformation, and clickbait. Displays a verdict, risk scores, and specific findings.
- **AI Chatbot (RAG)** — Ask questions about the page you're currently viewing. The extension reads the page content — including text extracted from linked PDFs — and sends it along with your question to a backend LLM for a contextual answer.
- **Tech X-ray** — Fingerprints the technologies powering a page by inspecting page globals, scripts, headers, and DOM markers. Detects across categories: Frameworks, CMS, Language & Runtime, Backend/API, Build Tools, CDN & Hosting, Analytics, Payments, Security, State Management, Testing, and Fonts & UI.
- **PDF Text Extraction** — An offscreen document running pdf.js extracts text from PDF pages/links so the chatbot and security scan can work on PDFs, not just HTML pages.
- **Floating AI Buddy** — An animated avatar (choose between fox, cat, or penguin) that follows your cursor on the page. Click it to open the chat side panel.

## Project Structure

├── manifest.json # Extension manifest (MV3)
├── background.js # Service worker — handles RAG queries, opens side panel
├── content.js # Injected into every page — extracts page text, renders floating avatar
├── techdetect.js # Injected into page context — fingerprints tech stack for Tech X-ray
├── offscreen.html / offscreen.js # Offscreen document — runs pdf.js to extract PDF text
├── pdf-extract.js # Service-worker-side helper that talks to the offscreen document
├── pdf.mjs / pdf.worker.mjs # Bundled pdf.js library + worker
├── popup.html / popup.js # Toolbar popup UI — security scan, Tech X-ray, avatar toggle
├── sidepanel.html / sidepanel.js # Chat side panel UI
└── backend/ # Flask backend (Groq LLaMA3-70B) — see backend/README.md

## How It Works

1. **Content script** (`content.js`) runs on every page, extracting clean readable text (stripping scripts, nav, footer, etc.), rendering the floating avatar, and exposing extracted content via `chrome.runtime` messages.
2. **Tech detection** (`techdetect.js`) is injected directly into the page's own JS context via `chrome.scripting.executeScript`, so it can see page globals (`window.React`, `window.Shopify`, etc.) that the isolated content script can't. It scans scripts, links, meta tags, and DOM attributes, then returns categorized findings.
3. **PDF extraction** (`pdf-extract.js` + `offscreen.js`) spins up an offscreen document to run pdf.js when the current page or a linked document is a PDF, extracting up to 50 pages of text for use in the scan/chat features.
4. **Popup** (`popup.js`) lets you trigger a security scan or Tech X-ray, sending the page's URL/title/text to the backend and rendering the structured result.
5. **Side panel** (`sidepanel.js` / `background.js`) lets you ask questions about the page. The question and page text (including extracted PDF text) are sent to the backend's `/rag-query` endpoint.
6. **Backend** (Flask + Groq LLaMA3-70B) processes `/security-scan` and `/rag-query` requests and returns structured/plain-text responses. See `backend/README.md` for setup and deployment.

## Installation (Load Unpacked)

1. Clone this repo.
2. Go to `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the repo folder.
5. Pin the extension from the toolbar for easy access.

## Backend Setup

The extension depends on a Flask backend for the security scan and chat features. See [`backend/README.md`](./backend/README.md) for setup, environment variables, and deployment instructions.

The backend is deployed on Render at:
https://all-for-one-r4jy.onrender.com


Both `background.js` and `popup.js` are configured to use this URL via a `BACKEND_URL` constant.

⚠️ **Render free tier note:** the backend spins down after ~15 minutes of inactivity. The first request after idle time can take 20–50 seconds to respond while the service cold-starts. If a scan or chat query seems stuck on the first try, wait a few seconds and try again.

## Permissions

- `storage` — persists avatar toggle/character selection
- `activeTab` / `scripting` — reads content from the current tab and injects `techdetect.js` into the page context
- `sidePanel` — powers the chat UI
- `offscreen` — runs pdf.js in an offscreen document for PDF text extraction
- `<all_urls>` — content script needs to run on any page for the security scan, Tech X-ray, and chat features

## Roadmap

- [x] Deploy backend to Render and unify `BACKEND_URL` across `background.js` and `popup.js`
- [x] Implement Tech X-ray detection logic
- [x] Add PDF text extraction for scan/chat features
- [x] Multiple selectable buddy characters (fox, cat, penguin)
- [x] Persist chat history in the side panel across sessions

## Tech Stack

- **Frontend:** Chrome Extension (Manifest V3), vanilla JS, pdf.js
- **Backend:** Flask, Groq (LLaMA3-70B), `flask-cors`
- **Deployment:** Render
