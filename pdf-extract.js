// pdf-extract.js — runs in background.js (service worker context)

let creatingOffscreen; // promise guard against duplicate creation

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });

  if (existing.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["WORKERS"],
    justification: "Run pdf.js to extract text from PDF files"
  });

  await creatingOffscreen;
  creatingOffscreen = null;
}

export async function extractTextFromPdfUrl(url) {
  await ensureOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "EXTRACT_PDF_TEXT", url },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.success) {
          reject(new Error(response?.error || "PDF extraction failed"));
          return;
        }
        resolve({ text: response.text, numPages: response.numPages });
      }
    );
  });
}

export function isPdfUrl(url) {
  if (!url) return false;
  const withoutQuery = url.split("?")[0].split("#")[0];
  return withoutQuery.toLowerCase().endsWith(".pdf");
}