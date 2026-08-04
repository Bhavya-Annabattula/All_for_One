import os
import json
import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq

app = Flask(__name__)

# Allow requests from the Chrome extension (chrome-extension:// origin)
# and from anywhere else while you're testing. Tighten this later if you want.
CORS(app)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. Requests will fail until it is.")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

MODEL = "llama3-70b-8192"

MAX_TEXT_CHARS = 12000  # keep prompts within a safe token budget


def truncate(text, limit=MAX_TEXT_CHARS):
    if not text:
        return ""
    return text[:limit]


def extract_json(raw_text):
    """Groq sometimes wraps JSON in prose or code fences. Pull the first {...} block out."""
    raw_text = raw_text.strip()
    raw_text = re.sub(r"^```(json)?", "", raw_text).strip()
    raw_text = re.sub(r"```$", "", raw_text).strip()
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if match:
        raw_text = match.group(0)
    return json.loads(raw_text)


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "extension-backend"})


@app.route("/security-scan", methods=["POST"])
def security_scan():
    if not client:
        return jsonify({"error": "Server missing GROQ_API_KEY"}), 500

    data = request.get_json(force=True, silent=True) or {}
    url = data.get("url", "")
    title = data.get("title", "")
    text = truncate(data.get("text", ""))

    if not text:
        return jsonify({"error": "No page text provided"}), 400

    system_prompt = (
        "You are a website safety analyst. You will be given a webpage's URL, title, "
        "and visible text. Assess the page for four risk categories: "
        "aiGenerated (likely AI-written content), scam (fraud/scam indicators), "
        "fakeNews (misinformation/unverified claims presented as fact), and "
        "clickbait (sensationalized or misleading framing).\n\n"
        "Respond with ONLY a JSON object, no prose, no markdown fences, in exactly this shape:\n"
        "{\n"
        '  "verdict": "safe" | "warning" | "danger",\n'
        '  "verdictTitle": "short headline, e.g. Looks Safe",\n'
        '  "verdictSummary": "1-2 sentence summary of the overall assessment",\n'
        '  "scores": {"aiGenerated": 0-100, "scam": 0-100, "fakeNews": 0-100, "clickbait": 0-100},\n'
        '  "findings": [{"level": "ok" | "warn" | "danger", "text": "short finding"}]\n'
        "}\n"
        "Include 3-6 findings. Higher scores mean higher risk in that category."
    )

    user_prompt = f"URL: {url}\nTitle: {title}\n\nPage text:\n{text}"

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=800,
        )
        raw = completion.choices[0].message.content
        result = extract_json(raw)
        return jsonify(result)
    except json.JSONDecodeError:
        return jsonify({"error": "Model did not return valid JSON", "raw": raw}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/rag-query", methods=["POST"])
def rag_query():
    if not client:
        return jsonify({"error": "Server missing GROQ_API_KEY"}), 500

    data = request.get_json(force=True, silent=True) or {}
    page_text = truncate(data.get("page_text", ""))
    page_url = data.get("page_url", "")
    question = data.get("question", "")

    if not question:
        return jsonify({"error": "No question provided"}), 400
    if not page_text:
        return jsonify({"error": "No page text provided"}), 400

    system_prompt = (
        "You are a helpful assistant answering questions about the webpage the user "
        "is currently viewing. Use only the provided page content to answer. "
        "If the answer isn't in the page content, say so clearly instead of guessing. "
        "Keep answers concise and directly useful."
    )

    user_prompt = (
        f"Page URL: {page_url}\n\n"
        f"Page content:\n{page_text}\n\n"
        f"Question: {question}"
    )

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=600,
        )
        answer = completion.choices[0].message.content.strip()
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
