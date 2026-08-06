import os
import json
import re

from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

# Allow requests from the Chrome extension (chrome-extension:// origin)
# and from anywhere else while you're testing. Tighten this later if you want.
CORS(app)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. Requests will fail until it is.")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

MODEL = "llama-3.3-70b-versatile"

MAX_TEXT_CHARS = 40000  # raised since we now retrieve only relevant chunks, not the whole page
CHUNK_SIZE = 220        # target characters per chunk - small enough for precise retrieval
CHUNK_OVERLAP = 40      # characters carried over between chunks
TOP_K = 6               # how many chunks to send to the model per question


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


def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split text into overlapping chunks, breaking on sentence boundaries where possible."""
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = ""

    for sentence in sentences:
        if len(sentence) > chunk_size:
            if current:
                chunks.append(current.strip())
                current = ""
            for i in range(0, len(sentence), chunk_size):
                chunks.append(sentence[i:i + chunk_size])
            continue

        if len(current) + len(sentence) + 1 <= chunk_size:
            current += (" " if current else "") + sentence
        else:
            if current:
                chunks.append(current.strip())
            overlap_text = current[-overlap:] if len(current) > overlap else current
            current = (overlap_text + " " + sentence).strip()

    if current.strip():
        chunks.append(current.strip())

    return chunks


def retrieve_relevant_chunks(chunks, question, top_k=TOP_K):
    """Rank chunks by TF-IDF cosine similarity to the question, return the top_k."""
    if len(chunks) <= top_k:
        return chunks

    try:
        vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
        chunk_vectors = vectorizer.fit_transform(chunks)
        question_vector = vectorizer.transform([question])
        sims = cosine_similarity(question_vector, chunk_vectors)[0]

        ranked_indices = sims.argsort()[::-1][:top_k]
        ranked_indices = sorted(ranked_indices)
        return [chunks[i] for i in ranked_indices]
    except ValueError:
        return chunks[:top_k]


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
    text = truncate(data.get("text", ""), limit=12000)

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

    chunks = chunk_text(page_text)
    relevant_chunks = retrieve_relevant_chunks(chunks, question)
    context = "\n\n---\n\n".join(relevant_chunks)

    system_prompt = (
        "You answer questions for someone browsing a webpage. You are given "
        "excerpts from that page and a question. Follow this exact procedure:\n\n"
        "STEP 1: Check if the excerpts below answer the question.\n"
        "STEP 2: If yes, answer using the excerpts. Do not mention excerpts, pages, "
        "or sources - just answer naturally, as if you simply know it.\n"
        "STEP 3: If the excerpts do NOT answer the question, you must still answer "
        "the question yourself using your own knowledge. Do not say the information "
        "is unavailable, missing, or not mentioned. Instead, output exactly this "
        "first line: (Not on this page - answering from general knowledge) then "
        "a blank line, then a real, complete answer to the question from your own "
        "knowledge.\n\n"
        "You are never allowed to simply say the excerpts don't cover something and "
        "stop there. Saying not available or not mentioned without also giving "
        "the STEP 3 fallback answer is wrong and against your instructions. "
        "Only say you don't know if you genuinely have no knowledge of the topic "
        "at all, independent of the page.\n"
        "Keep answers concise and directly useful."
    )

    user_prompt = (
        f"Page URL: {page_url}\n\n"
        f"Relevant excerpts from the page:\n{context}\n\n"
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
        return jsonify({
            "answer": answer,
            "chunks_used": len(relevant_chunks),
            "total_chunks": len(chunks),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
