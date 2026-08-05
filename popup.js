async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error("No active tab found");
  return tab;
}

// --- Panel switching for X-ray / Security / Avatar ---
const panelButtons = [
  document.getElementById("assistanceBtn"),
  document.getElementById("xrayIconBtn"),
  document.getElementById("securityIconBtn")
];

function activatePanel(btn) {
  panelButtons.forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.panel).classList.add("active");
}

panelButtons.forEach(btn => {
  btn.addEventListener("click", () => activatePanel(btn));
});

// --- AI Chatbot: opens side panel directly, closes popup ---
document.getElementById("chatbotBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  await chrome.sidePanel.open({ tabId: tab.id });
  window.close();
});

// --- Site status bar ---
async function loadSiteStatus() {
  try {
    const tab = await getActiveTab();
    const url = new URL(tab.url);
    document.getElementById("siteUrl").textContent = url.hostname;

    const dot = document.getElementById("statusDot");
    const label = document.getElementById("statusLabel");

    if (url.protocol === "https:") {
      dot.classList.add("safe");
      label.textContent = "Looks secure (HTTPS)";
    } else {
      dot.classList.add("warning");
      label.textContent = "Not using HTTPS";
    }
  } catch (err) {
    document.getElementById("statusLabel").textContent = "Unable to check this page";
  }
}
loadSiteStatus();

// --- X-ray ---
document.getElementById("xrayBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("xrayResult");
  const btn = document.getElementById("xrayBtn");

  btn.disabled = true;
  btn.textContent = "Scanning...";
  resultDiv.innerHTML = "Scanning this page...";

  try {
    const tab = await getActiveTab();

    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectTechStack,
      world: "MAIN"
    });

    const data = injectionResult && injectionResult.result
      ? injectionResult.result
      : { categories: {} };

    renderXrayResult(data);
  } catch (err) {
    resultDiv.innerHTML = `<div style="color:#f87171;">Error: ${escHtml(err.message)}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Run Tech X-ray";
});

function renderXrayResult(data) {
  const resultDiv = document.getElementById("xrayResult");
  const categories = data.categories || {};
  const catNames = Object.keys(categories);

  if (catNames.length === 0) {
    resultDiv.innerHTML = `<div style="color:#999; font-size:12px;">No recognizable technologies detected on this page.</div>`;
    return;
  }

  const catColors = {
    "Frameworks": "#818cf8",
    "CMS": "#f472b6",
    "Analytics": "#eab308",
    "CDN": "#38bdf8",
    "Hosting": "#38bdf8",
    "Fonts & UI": "#a78bfa",
    "Payments": "#22c55e"
  };

  const html = catNames.map(cat => {
    const items = categories[cat];
    const color = catColors[cat] || "#999";
    const itemsHtml = items.map(item => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #2a2a3d;">
        <span style="font-size:12px;">${escHtml(item.name)}</span>
      </div>
    `).join("");

    return `
      <div style="margin-bottom:10px;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:${color}; margin-bottom:4px; font-weight:600;">
          ${escHtml(cat)}
        </div>
        ${itemsHtml}
      </div>
    `;
  }).join("");

  resultDiv.innerHTML = html;
}

// --- Security ---
// --- Security ---
const BACKEND_URL = "https://all-for-one-r4jy.onrender.com";// same URL as your RAG backend

document.getElementById("securityBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("securityResult");
  const btn = document.getElementById("securityBtn");

  btn.disabled = true;
  btn.textContent = "Scanning...";
  resultDiv.innerHTML = "Scanning this page...";

  try {
    const tab = await getActiveTab();

    const pageData = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          reject(new Error("Could not read page content"));
          return;
        }
        resolve(response);
      });
    });

    const res = await fetch(`${BACKEND_URL}/security-scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: pageData.url,
        title: pageData.title,
        text: pageData.text
      })
    });

    if (!res.ok) throw new Error("Backend error: " + res.status);
    const data = await res.json();

    renderSecurityResult(data);
  } catch (err) {
    resultDiv.innerHTML = `<div style="color:#f87171;">Error: ${escHtml(err.message)}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Check Site Safety";
});

function renderSecurityResult(d) {
  const resultDiv = document.getElementById("securityResult");
  const verdictColor = d.verdict === "safe" ? "#22c55e" : d.verdict === "warning" ? "#eab308" : "#ef4444";
  const labels = { aiGenerated: "AI-Generated Content", scam: "Scam / Fraud", fakeNews: "Fake / Misinformation", clickbait: "Clickbait" };

  const scoresHtml = Object.entries(d.scores || {}).map(([key, val]) => {
    const barColor = val < 35 ? "#22c55e" : val < 65 ? "#eab308" : "#ef4444";
    return `
      <div style="margin-bottom:6px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; color:#999;">
          <span>${labels[key] || key}</span><span>${val}%</span>
        </div>
        <div style="height:5px; background:#1e1e2e; border-radius:99px; overflow:hidden;">
          <div style="height:100%; width:${val}%; background:${barColor};"></div>
        </div>
      </div>`;
  }).join("");

  const findingsHtml = (d.findings || []).map(f => {
    const dotColor = f.level === "ok" ? "#22c55e" : f.level === "warn" ? "#eab308" : "#ef4444";
    return `<div style="display:flex; gap:6px; font-size:11px; margin-bottom:4px;">
      <span style="color:${dotColor};">●</span><span>${escHtml(f.text)}</span>
    </div>`;
  }).join("");

  resultDiv.innerHTML = `
    <div style="border-left:3px solid ${verdictColor}; padding-left:8px; margin-bottom:10px;">
      <strong style="color:${verdictColor}; font-size:13px;">${escHtml(d.verdictTitle || "")}</strong>
      <p style="font-size:11px; color:#bbb; margin:4px 0 0;">${escHtml(d.verdictSummary || "")}</p>
    </div>
    <div>${scoresHtml}</div>
    <div style="margin-top:8px; padding-top:8px; border-top:1px solid #3a3a4d;">${findingsHtml}</div>
  `;
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Avatar (AI Assistance) toggle ---
const avatarToggle = document.getElementById("avatarToggle");

chrome.storage.local.get(["avatarEnabled"], (result) => {
  avatarToggle.checked = result.avatarEnabled === true; // default OFF now, user opts in
});

avatarToggle.addEventListener("change", async () => {
  const enabled = avatarToggle.checked;
  chrome.storage.local.set({ avatarEnabled: enabled });

  try {
    const tab = await getActiveTab();
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_AVATAR", enabled });
  } catch (err) {
    // no active tab or content script not present - ignore
  }
});
