import * as pdfjsLib from "./pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.mjs");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "EXTRACT_PDF_TEXT") return false;

  (async () => {
    try {
      const response = await fetch(message.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 50);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n\n";
      }

      sendResponse({
        success: true,
        text: fullText.replace(/\s+/g, " ").trim(),
        numPages: pdf.numPages
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // async response
});