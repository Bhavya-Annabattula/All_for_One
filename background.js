const BACKEND_URL = "https://your-backend-url.hf.space"; // update once deployed

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error("No active tab found");
  }
  return tab.id;
}

async function getPageContentFromActiveTab() {
  const tabId = await getActiveTabId();
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_CONTENT" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender.tab && sender.tab.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    return;
  }

  if (message.type === "ASK_QUESTION") {
    (async () => {
      try {
        const pageData = await getPageContentFromActiveTab();

        const res = await fetch(`${BACKEND_URL}/rag-query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page_text: pageData.text,
            page_url: pageData.url,
            question: message.question
          })
        });
        const data = await res.json();
        sendResponse({ success: true, answer: data.answer });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // keep channel open for async response
  }
});