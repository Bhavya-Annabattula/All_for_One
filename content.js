// Runs inside every webpage. Job: grab clean, readable text when asked.
console.log("content script loaded, chrome.runtime:", chrome.runtime);

function getPageText() {
  const clone = document.body.cloneNode(true);

  const junkSelectors = ["script", "style", "noscript", "nav", "footer", "svg"];
  junkSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  const text = clone.innerText || clone.textContent || "";
  return text.replace(/\s+/g, " ").trim();
}

function getPageMeta() {
  return {
    title: document.title,
    url: window.location.href,
    text: getPageText()
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTENT") {
    sendResponse(getPageMeta());
    return;
  }

  if (message.type === "TOGGLE_AVATAR") {
    const existing = document.getElementById("aio-avatar");
    if (message.enabled) {
      if (!existing) createAvatar();
    } else {
      if (existing) existing.remove();
    }
    return;
  }
});

// ===== Floating AI Avatar =====

function createAvatar() {
  if (document.getElementById("aio-avatar")) return;

  const avatar = document.createElement("div");
  avatar.id = "aio-avatar";

  avatar.innerHTML = `
    <svg id="aio-cat-svg" width="64" height="64" viewBox="0 0 100 100">
      <!-- Tail -->
      <path id="aio-tail" d="M 78 78 Q 95 75 90 55" stroke="#f3d9c4" stroke-width="10" fill="none" stroke-linecap="round"/>

      <!-- Back paws -->
      <ellipse cx="38" cy="86" rx="7" ry="6" fill="#fffaf3" stroke="#e8d5c0" stroke-width="1.5"/>
      <ellipse cx="62" cy="86" rx="7" ry="6" fill="#fffaf3" stroke="#e8d5c0" stroke-width="1.5"/>

      <!-- Body -->
      <ellipse cx="50" cy="68" rx="30" ry="24" fill="#fffaf3" stroke="#e8d5c0" stroke-width="1.5"/>

      <!-- Front paws -->
      <ellipse cx="40" cy="88" rx="6" ry="5" fill="#fffaf3" stroke="#e8d5c0" stroke-width="1.5"/>
      <ellipse cx="60" cy="88" rx="6" ry="5" fill="#fffaf3" stroke="#e8d5c0" stroke-width="1.5"/>

      <!-- Ears (outer, tan) -->
      <path d="M 25 30 Q 20 8 42 22 Z" fill="#f3d9c4" stroke="#e0bda0" stroke-width="1.5"/>
      <path d="M 75 30 Q 80 8 58 22 Z" fill="#f3d9c4" stroke="#e0bda0" stroke-width="1.5"/>
      <!-- Ears (inner, pink) -->
      <path d="M 29 27 Q 27 14 40 22 Z" fill="#f8c9c9"/>
      <path d="M 71 27 Q 73 14 60 22 Z" fill="#f8c9c9"/>

      <!-- Head -->
      <circle cx="50" cy="40" r="26" fill="#fffaf3" stroke="#e8d5c0" stroke-width="1.5"/>

      <!-- Blush cheeks -->
      <ellipse cx="30" cy="44" rx="6" ry="4" fill="#f8c9c9" opacity="0.7"/>
      <ellipse cx="70" cy="44" rx="6" ry="4" fill="#f8c9c9" opacity="0.7"/>

      <!-- Whisker dots -->
      <circle cx="27" cy="38" r="1" fill="#333"/>
      <circle cx="24" cy="42" r="1" fill="#333"/>
      <circle cx="27" cy="46" r="1" fill="#333"/>
      <circle cx="73" cy="38" r="1" fill="#333"/>
      <circle cx="76" cy="42" r="1" fill="#333"/>
      <circle cx="73" cy="46" r="1" fill="#333"/>

      <!-- Eyes -->
      <ellipse id="aio-eye-left" cx="41" cy="38" rx="3" ry="4" fill="#2a2a2a"/>
      <ellipse id="aio-eye-right" cx="59" cy="38" rx="3" ry="4" fill="#2a2a2a"/>

      <!-- Nose -->
      <ellipse cx="50" cy="45" rx="2" ry="1.5" fill="#e0a8a0"/>

      <!-- Mouth -->
      <path d="M 50 47 Q 46 51 43 48" stroke="#333" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M 50 47 Q 54 51 57 48" stroke="#333" stroke-width="1.2" fill="none" stroke-linecap="round"/>

      <!-- Body stripes -->
      <path d="M 30 70 Q 34 68 30 64" stroke="#e8d5c0" stroke-width="1.5" fill="none" opacity="0.6"/>
      <path d="M 70 70 Q 66 68 70 64" stroke="#e8d5c0" stroke-width="1.5" fill="none" opacity="0.6"/>
    </svg>
  `;

  Object.assign(avatar.style, {
    position: "fixed",
    width: "64px",
    height: "64px",
    cursor: "pointer",
    zIndex: "2147483647",
    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))",
    transition: "transform 0.15s ease",
    userSelect: "none",
    right: "30px",
    bottom: "30px"
  });

  document.body.appendChild(avatar);

  // --- Idle bob animation ---
  let floatAngle = 0;
  setInterval(() => {
    floatAngle += 0.05;
    const bob = Math.sin(floatAngle) * 4;
    avatar.style.transform = `translateY(${bob}px)`;
  }, 30);

  // --- Blinking animation ---
  function blink() {
    const leftEye = document.getElementById("aio-eye-left");
    const rightEye = document.getElementById("aio-eye-right");
    if (!leftEye || !rightEye) return;
    leftEye.setAttribute("ry", "0.5");
    rightEye.setAttribute("ry", "0.5");
    setTimeout(() => {
      leftEye.setAttribute("ry", "4");
      rightEye.setAttribute("ry", "4");
    }, 150);
  }
  setInterval(blink, 3000 + Math.random() * 2000);

  // --- Tail twitch animation ---
  function twitchTail() {
    const tail = document.getElementById("aio-tail");
    if (!tail) return;
    tail.setAttribute("d", "M 78 78 Q 98 78 92 58");
    setTimeout(() => {
      tail.setAttribute("d", "M 78 78 Q 95 75 90 55");
    }, 300);
  }
  setInterval(twitchTail, 2500);

  // --- Follow cursor loosely ---
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let avatarX = window.innerWidth - 94;
  let avatarY = window.innerHeight - 94;
  let following = false;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function followLoop() {
    if (following) {
      avatarX += (mouseX + 24 - avatarX) * 0.08;
      avatarY += (mouseY + 24 - avatarY) * 0.08;
      avatar.style.left = avatarX + "px";
      avatar.style.top = avatarY + "px";
      avatar.style.right = "auto";
      avatar.style.bottom = "auto";
    }
    requestAnimationFrame(followLoop);
  }
  followLoop();

  // --- Hover reaction ---
  avatar.addEventListener("mouseenter", () => {
    avatar.style.transform += " scale(1.15)";
  });
  avatar.addEventListener("mouseleave", () => {
    avatar.style.transform = avatar.style.transform.replace(" scale(1.15)", "");
  });

  // --- Click reaction: squish + open chat ---
  avatar.addEventListener("click", () => {
    avatar.style.transform = "scale(0.8)";
    setTimeout(() => {
      avatar.style.transform = "scale(1)";
    }, 150);

    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  });

  // --- Double-click toggles follow mode ---
  avatar.addEventListener("dblclick", () => {
    following = !following;
    if (!following) {
      avatarX = parseFloat(avatar.style.left);
      avatarY = parseFloat(avatar.style.top);
    }
  });
}
chrome.storage.local.get(["avatarEnabled"], (result) => {
  if (result.avatarEnabled === true) {
    createAvatar();
  }
});