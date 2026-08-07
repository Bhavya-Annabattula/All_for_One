const MAX_HISTORY_TURNS = 5;
let conversationHistory = [];

function clearEmptyState() {
  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.remove();
}

function addMessage(text, sender, opts = {}) {
  clearEmptyState();
  const chatLog = document.getElementById("chatLog");
  const msg = document.createElement("div");
  msg.className = "msg " + sender + (opts.className ? " " + opts.className : "");
  if (opts.html) {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
  return msg;
}

function addThinkingBubble(label = "Thinking") {
  clearEmptyState();
  const chatLog = document.getElementById("chatLog");
  const msg = document.createElement("div");
  msg.className = "msg bot thinking";
  msg.innerHTML = `${label} <span class="dot-pulse"><span></span><span></span><span></span></span>`;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
  return msg;
}

async function sendQuestion(question) {
  if (!question) return;

  addMessage(question, "user");

  const askBtn = document.getElementById("askBtn");
  askBtn.disabled = true;

  let isPdf = false;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    isPdf = !!tab?.url?.split("?")[0].split("#")[0].toLowerCase().endsWith(".pdf");
  } catch (err) {
    // ignore — fall back to default label
  }

  const thinkingMsg = addThinkingBubble(isPdf ? "Reading PDF" : "Thinking");

  chrome.runtime.sendMessage(
    {
      type: "ASK_QUESTION",
      question: question,
      history: conversationHistory
    },
    (response) => {
      thinkingMsg.remove();
      askBtn.disabled = false;

      if (chrome.runtime.lastError) {
        addMessage("Error: " + chrome.runtime.lastError.message, "bot", { className: "error" });
        return;
      }

      if (!response) {
        addMessage("No response from background script.", "bot", { className: "error" });
        return;
      }

      if (response.success) {
        addMessage(response.answer, "bot");
        conversationHistory.push({ question: question, answer: response.answer });
        if (conversationHistory.length > MAX_HISTORY_TURNS) {
          conversationHistory = conversationHistory.slice(-MAX_HISTORY_TURNS);
        }
      } else {
        addMessage("Error: " + response.error, "bot", { className: "error" });
      }
    }
  );
}

document.getElementById("askBtn").addEventListener("click", () => {
  const input = document.getElementById("questionInput");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  sendQuestion(question);
});

document.getElementById("questionInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("askBtn").click();
});

document.querySelectorAll(".suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    sendQuestion(chip.dataset.q);
  });
});
