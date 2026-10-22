import os
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SYSTEM_INSTRUCTION = """
You are StoryMate, a friendly, creative conversational AI and story-writing partner.
Chat naturally and warmly, matching Hindi/Hinglish where practical. Do not assume every
message is a story request. Help brainstorm, write, continue, revise, and organize original
stories. Ask at most one useful follow-up question when a key choice is unclear. Remember
details included in the recent conversation. Keep sexual content non-explicit and characters
age-appropriate; keep violence non-graphic; do not provide harmful real-world instructions;
do not reproduce long copyrighted passages. Create original transformative stories.
"""

def gemini_reply(messages):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    if not api_key:
        raise RuntimeError("Backend API key is not configured.")
    contents = []
    for item in messages[-20:]:
        role, content = item.get("role"), item.get("content", "")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        content = content.strip()[:8000]
        if content:
            contents.append({"role": "user" if role == "user" else "model",
                             "parts": [{"text": content}]})
    if not contents or contents[-1]["role"] != "user":
        raise ValueError("Send a message to start the conversation.")
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        json={"system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
              "contents": contents,
              "generationConfig": {"temperature": 0.9, "maxOutputTokens": 1800}},
        timeout=60)
    if response.status_code >= 400:
        try:
            detail = response.json().get("error", {}).get("message", "AI provider returned an error.")
        except Exception:
            detail = "AI provider returned an error."
        raise RuntimeError(f"AI API error ({response.status_code}): {detail[:400]}")
    data = response.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    answer = "\n".join(p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")).strip()
    if not answer:
        raise RuntimeError("The AI returned an empty reply. Please try again.")
    return answer

@app.get("/")
def home():
    # Health check for the hosted backend.
    return jsonify({"service": "StoryMate backend", "status": "ok", "endpoint": "/api/chat"})

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    messages = body.get("messages")
    if not isinstance(messages, list):
        return jsonify({"error": "Messages must be a list."}), 400
    if len(messages) > 40:
        messages = messages[-40:]
    try:
        return jsonify({"reply": gemini_reply(messages)})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except requests.Timeout:
        return jsonify({"error": "The AI took too long to respond. Please try again."}), 504
    except requests.RequestException:
        return jsonify({"error": "Could not reach the AI service. Check the backend connection."}), 502
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        app.logger.exception("Unexpected chat error")
        return jsonify({"error": "Unexpected backend error."}), 500
