function addMessage(text, sender) {
  const chatLog = document.getElementById("chatLog");
  const msg = document.createElement("div");
  msg.className = "msg " + sender;
  msg.textContent = text;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error("No active tab found");
  return tab;
}

document.getElementById("askBtn").addEventListener("click", async () => {
  const input = document.getElementById("questionInput");
  const question = input.value.trim();
  if (!question) return;

  addMessage(question, "user");
  input.value = "";

  try {
    const tab = await getActiveTab();
    chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        addMessage("Error reading page content.", "bot");
        return;
      }
      addMessage("Backend not connected yet. I read the page: " + response.title, "bot");
    });
  } catch (err) {
    addMessage("Error: " + err.message, "bot");
  }
});

document.getElementById("questionInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("askBtn").click();
});