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
  resultDiv.innerHTML = `<div class="scan-loading"><span class="dot-pulse"><span></span><span></span><span></span></span> Scanning page for technologies...</div>`;

  try {
    const tab = await getActiveTab();

    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: window.detectTechStack,
      world: "MAIN"
    });

    const data = injectionResult && injectionResult.result
      ? injectionResult.result
      : { categories: {} };

    renderXrayResult(data);
  } catch (err) {
    resultDiv.innerHTML = `<div style="color:#dc2626;">Error: ${escHtml(err.message)}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Run Tech X-ray";
});

function renderXrayResult(data) {
  const resultDiv = document.getElementById("xrayResult");
  const categories = data.categories || {};
  const catNames = Object.keys(categories);

  if (catNames.length === 0) {
    resultDiv.innerHTML = `
      <div class="scan-empty">
        <div class="scan-empty-icon">◌</div>
        <div>No recognizable technologies detected on this page.</div>
      </div>`;
    return;
  }

  const catMeta = {
    "Frameworks": { color: "#818cf8", icon: "⚛" },
    "CMS": { color: "#f472b6", icon: "▤" },
    "Analytics": { color: "#eab308", icon: "◈" },
    "CDN": { color: "#38bdf8", icon: "☁" },
    "Hosting": { color: "#38bdf8", icon: "☁" },
    "Fonts & UI": { color: "#a78bfa", icon: "Aa" },
    "Payments": { color: "#22c55e", icon: "$" }
  };

  const totalCount = catNames.reduce((sum, c) => sum + categories[c].length, 0);

  const summaryHtml = `
    <div class="xray-summary-bar">
      <span>Scan complete</span>
      <span><strong>${totalCount}</strong> technolog${totalCount === 1 ? "y" : "ies"} detected</span>
    </div>`;

  const categoriesHtml = catNames.map((cat, i) => {
    const meta = catMeta[cat] || { color: "#999", icon: "•" };
    const items = categories[cat];

    const chipsHtml = items.map(item => `
      <div class="xray-chip" style="--chip-color: ${meta.color};">
        <span class="chip-name">${escHtml(item.name)}</span>
        <span class="chip-evidence" title="${escHtml(item.evidence || "")}">${escHtml(item.evidence || "")}</span>
      </div>
    `).join("");

    return `
      <div class="xray-category" style="animation-delay: ${i * 60}ms;">
        <div class="xray-category-header" style="color: ${meta.color};">
          <span class="cat-dot" style="background:${meta.color};"></span>
          <span>${escHtml(cat)}</span>
          <span class="cat-count">${items.length}</span>
        </div>
        ${chipsHtml}
      </div>
    `;
  }).join("");

  resultDiv.innerHTML = summaryHtml + categoriesHtml;
}

// --- Security ---
const BACKEND_URL = "https://all-for-one-r4jy.onrender.com";

document.getElementById("securityBtn").addEventListener("click", async () => {
  const resultDiv = document.getElementById("securityResult");
  const btn = document.getElementById("securityBtn");

  btn.disabled = true;
  btn.textContent = "Scanning...";
  resultDiv.innerHTML = `<div class="scan-loading"><span class="dot-pulse"><span></span><span></span><span></span></span> Analyzing page content...</div>`;

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
    resultDiv.innerHTML = `<div style="color:#dc2626;">Error: ${escHtml(err.message)}</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Check Site Safety";
});

function renderSecurityResult(d) {
  const resultDiv = document.getElementById("securityResult");
  const verdictColor = d.verdict === "safe" ? "#22c55e" : d.verdict === "warning" ? "#eab308" : "#ef4444";
  const labels = { aiGenerated: "AI-Generated Content", scam: "Scam / Fraud", fakeNews: "Fake / Misinformation", clickbait: "Clickbait" };

  const scores = d.scores || {};
  const riskValues = Object.values(scores);
  const avgRisk = riskValues.length ? riskValues.reduce((a, b) => a + b, 0) / riskValues.length : 0;
  const safetyPct = Math.max(0, Math.min(100, Math.round(100 - avgRisk)));

  const ringHtml = `
    <div class="sec-ring-wrap" style="background: conic-gradient(${verdictColor} ${safetyPct * 3.6}deg, #e8e6df 0deg); --ring-color: ${verdictColor};">
      <div class="sec-ring-inner">
        <div class="sec-ring-pct">${safetyPct}%</div>
        <div class="sec-ring-label">Safe</div>
      </div>
    </div>`;

  const bannerHtml = `
    <div class="sec-verdict-banner" style="--verdict-color: ${verdictColor};">
      ${ringHtml}
      <div class="sec-verdict-text">
        <strong>${escHtml(d.verdictTitle || "")}</strong>
        <p>${escHtml(d.verdictSummary || "")}</p>
      </div>
    </div>`;

  const scoreEntries = Object.entries(scores);
  const scoresHtml = scoreEntries.map(([key, val]) => {
    const [start, end] = val < 35
      ? ["#16a34a", "#22c55e"]
      : val < 65
        ? ["#ca8a04", "#eab308"]
        : ["#dc2626", "#ef4444"];
    return `
      <div class="sec-score-row">
        <div class="sec-score-label">
          <span>${labels[key] || key}</span><span>${val}%</span>
        </div>
        <div class="sec-score-track">
          <div class="sec-score-fill" data-target="${val}" style="--fill-start:${start}; --fill-end:${end};"></div>
        </div>
      </div>`;
  }).join("");

  const findingsHtml = (d.findings || []).map(f => {
    const dotColor = f.level === "ok" ? "#22c55e" : f.level === "warn" ? "#eab308" : "#ef4444";
    return `
      <div class="sec-finding-row">
        <span class="sec-finding-dot" style="background:${dotColor}; color:${dotColor};"></span>
        <span>${escHtml(f.text)}</span>
      </div>`;
  }).join("");

  resultDiv.innerHTML = `
    ${bannerHtml}
    <div>${scoresHtml}</div>
    <div class="sec-findings">${findingsHtml}</div>
  `;

  // Animate bars from 0 to their target width on the next frame,
  // so the fill transition actually plays instead of snapping instantly.
  requestAnimationFrame(() => {
    resultDiv.querySelectorAll(".sec-score-fill").forEach(el => {
      el.style.width = el.dataset.target + "%";
    });
  });
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

// --- Character picker ---
const characterOptions = document.querySelectorAll(".character-option");

function setSelectedCharacterUI(character) {
  characterOptions.forEach(opt => {
    opt.classList.toggle("selected", opt.dataset.character === character);
  });
}

chrome.storage.local.get(["avatarCharacter"], (result) => {
  const current = result.avatarCharacter || "cat";
  setSelectedCharacterUI(current);
});

characterOptions.forEach(opt => {
  opt.addEventListener("click", async () => {
    const character = opt.dataset.character;
    setSelectedCharacterUI(character);
    chrome.storage.local.set({ avatarCharacter: character });

    try {
      const tab = await getActiveTab();
      chrome.tabs.sendMessage(tab.id, { type: "SET_AVATAR_CHARACTER", character });
    } catch (err) {
      // no active tab or content script not present - ignore
    }
  });
});
