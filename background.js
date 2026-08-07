import { extractTextFromPdfUrl, isPdfUrl } from "./pdf-extract.js";

const BACKEND_URL = "https://all-for-one-r4jy.onrender.com";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error("No active tab found");
  }
  return tab;
}

async function getPageContentFromActiveTab() {
  const tab = await getActiveTab();

  if (isPdfUrl(tab.url)) {
    const { text, numPages } = await extractTextFromPdfUrl(tab.url);
    return {
      title: tab.title || tab.url.split("/").pop(),
      url: tab.url,
      text: text || "(This PDF appears to have no extractable text — it may be a scanned image.)",
      isPdf: true,
      numPages
    };
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" }, (response) => {
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
        sendResponse({ success: true, answer: data.answer, isPdf: pageData.isPdf || false });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
