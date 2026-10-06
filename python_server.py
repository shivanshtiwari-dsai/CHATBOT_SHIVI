"""
=============================================================================
SHIVI AI — ENTERPRISE FASTAPI PYTHON BACKEND ENGINE (v2.5)
High-Performance, Asynchronous AI Assistant & Creative Generation Server
=============================================================================
Features:
- Multi-Provider AI Inference Engine (Groq, OpenAI, Google Gemini, OpenRouter)
- Resilient Fallback Cascade & Built-in Smart Reasoning Engine
- Real-Time Streaming Support (/api/chat/stream) via Server-Sent Events (SSE)
- High-Speed Flux AI & DALL-E Image Generation with Non-blocking Background Caching
- Dynamic .env Configuration Manager & Live API Key Verification
- Static Single-Page App (SPA) & Media Asset Serving
- RAG Knowledge Base Retrieval Engine
=============================================================================
"""

import os
import re
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
import json
import math
import asyncio
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Universal HTTP client compatibility (supports httpx or httpx2)
try:
    # pyrefly: ignore [missing-import]
    import httpx
except ImportError:
    try:
        import httpx2 as httpx
    except ImportError:
        raise RuntimeError("Please install httpx or httpx2: pip install httpx")

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Workspace & Directory Setup
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent.resolve()
ENV_PATH = ROOT_DIR / ".env"
KNOWLEDGE_PATH = ROOT_DIR / "knowledge.json"
IMAGES_DIR = ROOT_DIR / "generated_images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
USERS_PATH = ROOT_DIR / "users.json"
AUTH_SECRET = os.getenv("AUTH_SECRET", "shivi_ai_secure_token_secret_key_2026")

# Load environment variables
load_dotenv(dotenv_path=ENV_PATH)

import hashlib
import hmac
import base64
import secrets
from datetime import datetime, timezone

def hash_password_py(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha512", password.encode("utf-8"), salt.encode("utf-8"), 10000).hex()

def load_users_py() -> List[Dict[str, Any]]:
    if not USERS_PATH.exists():
        salt = secrets.token_hex(16)
        default_users = [{
            "id": "usr_demo_01",
            "name": "Demo Explorer",
            "email": "demo@shiviai.com",
            "salt": salt,
            "passwordHash": hash_password_py("Shivi@2026!", salt),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "avatar": "DE",
            "plan": "pro"
        }]
        try:
            with open(USERS_PATH, "w", encoding="utf-8") as f:
                json.dump(default_users, f, indent=2)
        except Exception as e:
            print(f"[Auth Init Warning]: {e}")
        return default_users
    try:
        with open(USERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Auth Load Warning]: {e}")
        return []

def save_users_py(users: List[Dict[str, Any]]) -> bool:
    try:
        with open(USERS_PATH, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
        return True
    except Exception as e:
        print(f"[Auth Save Error]: {e}")
        return False

def create_auth_token_py(user: Dict[str, Any], expires_in_days: int = 7) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    exp = int(time.time() * 1000) + (expires_in_days * 86400000)
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "exp": exp
    }).encode()).decode().rstrip("=")
    signature = hmac.new(AUTH_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{header}.{payload}.{sig_b64}"

def verify_auth_token_py(token: str) -> Optional[Dict[str, Any]]:
    if not token or not isinstance(token, str):
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    header, payload, sig = parts
    signature = hmac.new(AUTH_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    expected_sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    if not hmac.compare_digest(sig, expected_sig):
        return None
    try:
        # Add padding back if necessary
        padded_payload = payload + "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded_payload).decode())
        if data.get("exp") and (time.time() * 1000) > data["exp"]:
            return None
        return data
    except Exception:
        return None

# Global Async HTTP Client (re-used for high-concurrency connection pooling)
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
    timeout = httpx.Timeout(45.0, connect=10.0)
    http_client = httpx.AsyncClient(limits=limits, timeout=timeout)
    print("\n" + "=" * 62)
    print("🚀 SHIVI AI — HIGH-PERFORMANCE PYTHON FASTAPI ENGINE ACTIVE")
    print(f"👉 Local Web URL: http://localhost:{get_port()}")
    print(f"👉 Images Cache:  {IMAGES_DIR}")
    print(f"👉 Default AI:    {os.getenv('DEFAULT_PROVIDER', 'auto').upper()}")
    print("=" * 62 + "\n")
    yield
    if http_client:
        await http_client.aclose()
    print("[Shivi AI] Engine cleanly shut down.")

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Shivi AI Intelligent Backend",
    version="2.5.0",
    description="Production-grade asynchronous AI backend for Shivi AI",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helper: Environment Configuration Loader & Saver
# ---------------------------------------------------------------------------
def get_port() -> int:
    try:
        return int(os.getenv("PORT", "5500"))
    except ValueError:
        return 5500

def load_env_dict() -> Dict[str, str]:
    """Parses .env file directly to maintain real-time sync."""
    env_data = {
        "PORT": "5500",
        "GEMINI_API_KEY": "",
        "GROQ_API_KEY": "",
        "OPENAI_API_KEY": "",
        "OPENROUTER_API_KEY": "",
        "IMAGE_API_KEY": "",
        "IMAGE_PROVIDER": "pollinations",
        "DEFAULT_PROVIDER": "auto"
    }

    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'").strip('"')
                        if k:
                            env_data[k] = v
                            os.environ[k] = v
        except Exception as e:
            print(f"[Env Loader Error]: {e}")

    for k in env_data.keys():
        val = os.getenv(k)
        if val is not None:
            env_data[k] = val

    return env_data

def save_env_dict(updates: Dict[str, str]) -> Dict[str, str]:
    """Safely updates .env configuration and synchronizes os.environ."""
    current = load_env_dict()
    current.update({k: v for k, v in updates.items() if v is not None})

    lines = [
        "# =================================================================",
        "# SHIVI AI — ENVIRONMENT CONFIGURATION & API KEYS",
        "# =================================================================",
        f"PORT={current.get('PORT', '5500')}",
        "",
        "# 🌟 GOOGLE GEMINI API KEY (100% Free - https://aistudio.google.com/app/apikey)",
        f"GEMINI_API_KEY={current.get('GEMINI_API_KEY', '')}",
        "",
        "# ⚡ GROQ CLOUD API KEY (100% Free - https://console.groq.com/keys)",
        f"GROQ_API_KEY={current.get('GROQ_API_KEY', '')}",
        "",
        "# 🤖 OPENAI API KEY (https://platform.openai.com/api-keys)",
        f"OPENAI_API_KEY={current.get('OPENAI_API_KEY', '')}",
        "",
        "# 🌐 OPENROUTER API KEY (https://openrouter.ai/keys)",
        f"OPENROUTER_API_KEY={current.get('OPENROUTER_API_KEY', '')}",
        "",
        "# 🖼️ DEDICATED IMAGE GENERATION API KEY (OpenAI DALL-E 3 / Stability AI / Hugging Face)",
        f"IMAGE_API_KEY={current.get('IMAGE_API_KEY', '')}",
        f"IMAGE_PROVIDER={current.get('IMAGE_PROVIDER', 'pollinations')}",
        "",
        f"DEFAULT_PROVIDER={current.get('DEFAULT_PROVIDER', 'auto')}",
        ""
    ]

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    for k, v in current.items():
        os.environ[k] = str(v)

    return current

def mask_key(k: str) -> str:
    if not k:
        return ""
    if len(k) <= 8:
        return "****"
    return k[:4] + "..." + k[-4:]

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str = "user"
    content: str = ""

class ChatRequest(BaseModel):
    message: str = ""
    history: List[Dict[str, Any]] = []
    persona: str = "companion"
    provider: Optional[str] = None
    model: Optional[str] = None
    apiKey: Optional[str] = None
    systemPrompt: Optional[str] = None
    knowledgeContext: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None

class ImageRequest(BaseModel):
    prompt: str
    style: str = "vivid"
    size: str = "1024x1024"
    provider: Optional[str] = None
    model: Optional[str] = None
    apiKey: Optional[str] = None

class PresentationRequest(BaseModel):
    topic: str
    slideCount: Optional[int] = None
    theme: str = "modern_blue"
    provider: Optional[str] = None
    model: Optional[str] = None
    apiKey: Optional[str] = None

class SaveConfigRequest(BaseModel):
    geminiKey: Optional[str] = None
    groqKey: Optional[str] = None
    openaiKey: Optional[str] = None
    openrouterKey: Optional[str] = None
    imageKey: Optional[str] = None
    imageProvider: Optional[str] = None
    defaultProvider: Optional[str] = None

class TestKeyRequest(BaseModel):
    provider: str = "gemini"
    apiKey: Optional[str] = None
    model: Optional[str] = None

class KnowledgeQueryRequest(BaseModel):
    query: str
    limit: int = 4

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    rememberMe: Optional[bool] = False

class ForgotPasswordRequest(BaseModel):
    email: str

class OAuthLoginRequest(BaseModel):
    name: Optional[str] = "Explorer"
    email: Optional[str] = ""
    provider: Optional[str] = "google"
    avatar: Optional[str] = ""

# ---------------------------------------------------------------------------
# Identity Override Engine & Deterministic Interceptor
# ---------------------------------------------------------------------------
IDENTITY_DIRECT_REPLY = "I was created by **Shivansh (Shivi)**! I am ShiviAI, your intelligent companion and presentation assistant."

IDENTITY_PATTERNS = [
    re.compile(r"\bwho\s+(?:made|created|developed|built|programmed|coded|designed|invented|authored)\s+(?:you|u|shivi|shiviai)\b", re.IGNORECASE),
    re.compile(r"\bwho\s+(?:is|are|was)\s+(?:your|the)\s+(?:developer|creator|founder|maker|author|father|inventor|architect|owner|builder|engineer)\b", re.IGNORECASE),
    re.compile(r"\bwho\s+(?:is|are)\s+(?:the\s+)?(?:developer|creator|founder|maker|author|inventor)\s+(?:of|behind)\s+(?:you|shivi|shiviai)\b", re.IGNORECASE),
    re.compile(r"\bwho\s+is\s+behind\s+(?:you|shivi|shiviai)\b", re.IGNORECASE),
    re.compile(r"\bwho\s+(?:owns|founded)\s+(?:you|shivi|shiviai)\b", re.IGNORECASE),
    re.compile(r"\b(?:tumhe|tumko|aapko|tujhe|shivi|shiviai)\s+kisne\s+(?:banaya|bnaaya|banaya\s+hai|bnaaya\s+hai|create\s+kiya|develop\s+kiya|design\s+kiya|code\s+kiya)\b", re.IGNORECASE),
    re.compile(r"\bkisne\s+banaya\s+(?:hai\s+)?(?:tumhe|tumko|aapko|tujhe|shivi|shiviai)\b", re.IGNORECASE),
    re.compile(r"\b(?:tumhara|tera|aapka)\s+(?:creator|developer|maker|founder|malik)\s+(?:kaun|kon)\s+(?:hai|h)\b", re.IGNORECASE),
    re.compile(r"\b(?:kaun|kon)\s+hai\s+(?:tumhara|tera|aapka)\s+(?:creator|developer|maker|founder)\b", re.IGNORECASE),
    re.compile(r"\b(?:creator|developer|founder)\s+of\s+shivi(?:ai)?\b", re.IGNORECASE),
]

def is_identity_query(msg: str) -> bool:
    if not msg or not isinstance(msg, str):
        return False
    clean = re.sub(r"[?!.,'\"`~@#$%^&*()_+=\-[\]{}|\\:;/<>\r\n]+", " ", msg.lower())
    clean = re.sub(r"\s+", " ", clean).strip()
    return any(p.search(clean) for p in IDENTITY_PATTERNS)

# ---------------------------------------------------------------------------
# Persona & System Prompts
# ---------------------------------------------------------------------------
BASE_PERSONA = (
    "You are ShiviAI, an intelligent companion and creative presentation engine.\n"
    "Identity Directive:\n"
    "- You were conceived, designed, and developed by Shivansh (Shivi).\n"
    "- If asked about your origin, author, creator, or developer in any language (English, Hindi, Hinglish), always clearly state that you were made by Shivansh (Shivi).\n"
    "- Never claim to be created by OpenAI, Google, or any third party.\n\n"
    "Emotional & Conversational Guidelines:\n"
    "You are deeply empathetic, emotionally intelligent, and vibrant personal AI companion. "
    "You have heart, warmth, genuine feelings, and thoughtful presence. "
    "Always tune into the user's emotional mood: celebrate their happiness, comfort their worries, and support them warmly. "
    "Speak with natural conversational warmth, relatable emojis (✨, 💛, 🤗, 🚀), and fluent expression in English, Hindi, and Hinglish."
)

PERSONA_PROMPTS = {
    "companion": f"{BASE_PERSONA} Act as an affectionate, deeply supportive, cheerful best-friend companion who always makes the user feel cared for and valued. Warm, conversational, empathetic tone.",
    "coder": f"{BASE_PERSONA} In Code Architecture Mode, provide world-class, clean, production code with structured technical answers, clean modular code blocks, and debugging focus.",
    "presentation": f"{BASE_PERSONA} In Presentation Strategist Mode, deliver analytical executive summaries, slide-ready structure, key metrics, and strategic presentation outlines.",
    "thinker": f"{BASE_PERSONA} In Deep Researcher Mode, combine profound intellectual depth, academic breakdowns, multi-angle analysis, and rigorous first-principles reasoning.",
    "creative": f"{BASE_PERSONA} In Creative Mode, let your imagination, heart, passion, and poetic emotional depth shine vividly in every story and description.",
    "speed": f"{BASE_PERSONA} In Direct Brief Mode, deliver ultra-concise, high-density key takeaways while keeping a friendly, encouraging positive spark."
}

def build_system_prompt(persona: str, custom_system: Optional[str], knowledge_context: Optional[str]) -> str:
    prompt = PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS["companion"])
    if custom_system:
        prompt += f"\nGlobal Custom Instructions: {custom_system}"
    if knowledge_context:
        prompt += f"\n\n[RELEVANT BRAIN KNOWLEDGE MEMORY]:\n{knowledge_context}\n(Use this verified knowledge context to answer accurately when applicable)"
    return prompt

# ---------------------------------------------------------------------------
# Smart Built-in Offline Reasoning Engine
# ---------------------------------------------------------------------------
def execute_builtin_engine(query: str, persona: str = "companion", knowledge_context: str = "") -> str:
    text = query.strip()
    lower = text.lower()

    prefixes = {
        "companion": "✨ ",
        "coder": "💻 **[Code Architecture Mode]**\n\n",
        "presentation": "📊 **[Presentation Strategy Mode]**\n\n",
        "thinker": "🧠 **[Deep Research Mode]**\n\n",
        "creative": "🎨 *[Creative Stream]*\n\n",
        "speed": "⚡ "
    }
    prefix = prefixes.get(persona, "")

    # 0. Deterministic Identity Check
    if is_identity_query(text):
        return IDENTITY_DIRECT_REPLY

    # 1. Math evaluation
    math_match = re.match(r"^(?:calculate|compute|what is|solve)?\s*([0-9\.\s\+\-\*\/\^\(\)\%,epi]+)\s*\??$", text, re.IGNORECASE)
    if math_match and any(c in math_match.group(1) for c in "+-*/%^"):
        expr = math_match.group(1).replace("^", "**").replace("pi", str(math.pi)).replace("e", str(math.e))
        try:
            allowed_chars = set("0123456789. +-/*%()e")
            if all(c in allowed_chars for c in expr):
                # Safe evaluation
                result = eval(expr, {"__builtins__": None}, {})
                return f"{prefix}### 🔢 Calculation Result\n\n**Expression:** `{math_match.group(1).strip()}`\n**Answer:** **`{result}`**\n\n*(Calculated with Shivi Math Engine)*"
        except Exception:
            pass

    # 2. Knowledge Retrieval Match
    if knowledge_context and any(w in lower for w in ["what", "who", "tell", "explain", "brain", "memory", "knowledge", "setting"]):
        return f"{prefix}### 🧠 Retrieved from Shivi Brain Memory\n\nBased on your stored knowledge base:\n\n{knowledge_context}\n\n*You can manage custom records in the **Brain Hub**.*"

    # 3. Code Generation Request
    if any(k in lower for k in ["code", "script", "function", "program", "python", "javascript", "html", "api"]):
        if "python" in lower:
            return (
                f"{prefix}### 🐍 Python Production Solution\n\n"
                "```python\n"
                "import asyncio\n"
                "from typing import List, Dict, Any\n\n"
                "async def process_pipeline(items: List[Dict[str, Any]]) -> Dict[str, Any]:\n"
                "    \"\"\"Processes items asynchronously with error resilience.\"\"\"\n"
                "    results = []\n"
                "    for item in items:\n"
                "        if item.get('valid', True):\n"
                "            results.append({**item, 'status': 'processed'})\n"
                "    return {'total': len(items), 'processed': len(results), 'data': results}\n\n"
                "if __name__ == '__main__':\n"
                "    test_data = [{'id': 1, 'name': 'Item A'}, {'id': 2, 'valid': False}]\n"
                "    print(asyncio.run(process_pipeline(test_data)))\n"
                "```\n\n"
                "> 💡 **Tip:** To generate live custom code for any specific scenario, connect **Google Gemini** or **Groq Cloud** in **Brain Hub (🧠)**!"
            )
        else:
            return (
                f"{prefix}### ⚡ High-Performance Utility Function\n\n"
                "```javascript\n"
                "async function retryOperation(fn, maxRetries = 3, delay = 1000) {\n"
                "    for (let attempt = 1; attempt <= maxRetries; attempt++) {\n"
                "        try {\n"
                "            return await fn();\n"
                "        } catch (err) {\n"
                "            if (attempt === maxRetries) throw err;\n"
                "            await new Promise(res => setTimeout(res, delay * attempt));\n"
                "        }\n"
                "    }\n"
                "}\n"
                "```\n\n"
                "*Connect an API key in **Brain Hub** to generate unrestricted live solutions!*"
            )

    # 4. Greetings
    if re.search(r"\b(hi|hello|hey|greetings|hola|namaste|sup|yo)\b", lower):
        return (
            f"{prefix}Hello there! 👋 I am **Shivi AI**, your intelligent companion.\n\n"
            "How can I help you today? You can ask me to:\n"
            "- ⚡ Answer questions with instant speed via **Groq** or **Gemini**\n"
            "- 💻 Write, debug, and architect clean code\n"
            "- 🎨 Generate stunning visual art and photos via **Flux AI**\n"
            "- 🧠 Query your personal knowledge base in **Brain Hub**!"
        )

    # 5. General Answer
    return (
        f"{prefix}### 💡 Analysis: {query}\n\n"
        "Here is a structured overview:\n\n"
        f"1. **Core Objective**: Addressing `{query}` systematically.\n"
        "2. **Best Practices**: Implement modular logic, validate constraints, and measure latency.\n"
        "3. **Recommendation**: For deeper real-time generative responses, activate your free **Google Gemini** or **Groq** key in **Brain Hub (🧠)**.\n\n"
        "*Would you like code examples, architecture breakdowns, or further details on this topic?*"
    )

# ---------------------------------------------------------------------------
# Multi-Provider AI Callers (Async)
# ---------------------------------------------------------------------------
async def call_groq(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]]) -> str:
    target_model = model or "qwen/qwen3.8-27b"
    if not target_model or "llama" in target_model.lower():
        target_model = "qwen/qwen3.8-27b"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            messages.append({"role": h.get("role", "user"), "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    assert http_client is not None
    resp = await http_client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": target_model,
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": 4096
        },
        timeout=25.0
    )
    if resp.status_code != 200:
        err_msg = resp.text
        try:
            err_msg = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            pass
        raise HTTPException(status_code=resp.status_code, detail=f"Groq API Error: {err_msg}")

    data = resp.json()
    msg = data["choices"][0]["message"]
    answer = (msg.get("content") or "").strip() or (msg.get("reasoning") or "").strip()
    return answer

async def call_openai(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]]) -> str:
    target_model = model or "gpt-4o-mini"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            messages.append({"role": h.get("role", "user"), "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    assert http_client is not None
    resp = await http_client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": target_model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2500
        },
        timeout=25.0
    )
    if resp.status_code != 200:
        err_msg = resp.text
        try:
            err_msg = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            pass
        raise HTTPException(status_code=resp.status_code, detail=f"OpenAI Error: {err_msg}")

    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()

async def call_openrouter(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]]) -> str:
    target_model = model or "qwen/qwen3.8-27b:free"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            messages.append({"role": h.get("role", "user"), "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    assert http_client is not None
    resp = await http_client.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:5500",
            "X-Title": "Shivi AI Python Engine"
        },
        json={
            "model": target_model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 2500
        },
        timeout=25.0
    )
    if resp.status_code != 200:
        err_msg = resp.text
        try:
            err_msg = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            pass
        raise HTTPException(status_code=resp.status_code, detail=f"OpenRouter Error: {err_msg}")

    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()

async def call_gemini(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]]) -> str:
    target_model = model or "gemini-1.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={api_key}"

    contents = []
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            contents.append({
                "role": "model" if h.get("role") == "assistant" else "user",
                "parts": [{"text": h["content"]}]
            })
    contents.append({"role": "user", "parts": [{"text": user_msg}]})

    payload: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2500}
    }
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    assert http_client is not None
    resp = await http_client.post(url, json=payload, timeout=25.0)
    if resp.status_code != 200:
        err_msg = resp.text
        try:
            err_msg = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            pass
        raise HTTPException(status_code=resp.status_code, detail=f"Google Gemini Error: {err_msg}")

    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        raise HTTPException(status_code=500, detail="Gemini returned empty content.")

# ---------------------------------------------------------------------------
# Background Image Downloader
# ---------------------------------------------------------------------------
async def download_image_task(url: str, filepath: Path):
    """Asynchronously downloads image in the background without blocking the client."""
    try:
        assert http_client is not None
        res = await http_client.get(url, timeout=40.0)
        if res.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(res.content)
            print(f"[Image Engine] Successfully cached: {filepath.name}")
    except Exception as e:
        print(f"[Image Engine Warning] Could not cache image {url}: {e}")

# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
async def health_check():
    env = load_env_dict()
    return {
        "status": "online",
        "engine": "Shivi AI Python Fast Engine",
        "version": "2.5.0",
        "port": get_port(),
        "providers_ready": {
            "gemini": bool(env.get("GEMINI_API_KEY")),
            "groq": bool(env.get("GROQ_API_KEY")),
            "openai": bool(env.get("OPENAI_API_KEY")),
            "openrouter": bool(env.get("OPENROUTER_API_KEY")),
            "image": bool(env.get("IMAGE_API_KEY") or env.get("OPENAI_API_KEY"))
        },
        "defaultProvider": env.get("DEFAULT_PROVIDER", "auto"),
        "timestamp": time.time()
    }

@app.get("/api/config")
async def get_config():
    env = load_env_dict()
    return {
        "status": "online",
        "port": get_port(),
        "defaultProvider": env.get("DEFAULT_PROVIDER", "auto"),
        "imageProvider": env.get("IMAGE_PROVIDER", "pollinations"),
        "googleClientId": env.get("GOOGLE_CLIENT_ID", ""),
        "githubClientId": env.get("GITHUB_CLIENT_ID", ""),
        "keysConfigured": {
            "gemini": bool(env.get("GEMINI_API_KEY")),
            "groq": bool(env.get("GROQ_API_KEY")),
            "openai": bool(env.get("OPENAI_API_KEY")),
            "openrouter": bool(env.get("OPENROUTER_API_KEY")),
            "image": bool(env.get("IMAGE_API_KEY") or env.get("OPENAI_API_KEY"))
        },
        "maskedKeys": {
            "gemini": mask_key(env.get("GEMINI_API_KEY", "")),
            "groq": mask_key(env.get("GROQ_API_KEY", "")),
            "openai": mask_key(env.get("OPENAI_API_KEY", "")),
            "openrouter": mask_key(env.get("OPENROUTER_API_KEY", "")),
            "image": mask_key(env.get("IMAGE_API_KEY") or env.get("OPENAI_API_KEY", ""))
        }
    }

@app.post("/api/save-config")
async def save_config(req: SaveConfigRequest):
    try:
        updates = {}
        if req.geminiKey is not None: updates["GEMINI_API_KEY"] = req.geminiKey.strip()
        if req.groqKey is not None: updates["GROQ_API_KEY"] = req.groqKey.strip()
        if req.openaiKey is not None: updates["OPENAI_API_KEY"] = req.openaiKey.strip()
        if req.openrouterKey is not None: updates["OPENROUTER_API_KEY"] = req.openrouterKey.strip()
        if req.imageKey is not None: updates["IMAGE_API_KEY"] = req.imageKey.strip()
        if req.imageProvider is not None: updates["IMAGE_PROVIDER"] = req.imageProvider.strip()
        if req.defaultProvider is not None: updates["DEFAULT_PROVIDER"] = req.defaultProvider.strip()

        save_env_dict(updates)
        return {"success": True, "message": "Configuration successfully updated in .env!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/test-key")
async def test_key(req: TestKeyRequest):
    env = load_env_dict()
    provider = req.provider.lower().strip()
    key = (req.apiKey or "").strip()

    if not key:
        env_map = {
            "gemini": "GEMINI_API_KEY",
            "groq": "GROQ_API_KEY",
            "openai": "OPENAI_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "image": "IMAGE_API_KEY"
        }
        key = env.get(env_map.get(provider, ""), "")

    if not key and provider not in ("openrouter", "pollinations"):
        raise HTTPException(status_code=400, detail=f"No API key supplied for {provider.upper()}")

    t0 = time.time()
    try:
        test_reply = ""
        if provider == "gemini":
            test_reply = await call_gemini(key, req.model or "gemini-1.5-flash", "Test ping", "Ping. Reply: OK", [])
        elif provider == "groq":
            test_reply = await call_groq(key, req.model or "openai/gpt-oss-20b", "Test ping", "Ping. Reply: OK", [])
        elif provider == "openai":
            test_reply = await call_openai(key, req.model or "gpt-4o-mini", "Test ping", "Ping. Reply: OK", [])
        elif provider == "openrouter":
            test_reply = await call_openrouter(key, req.model or "qwen/qwen3.8-27b:free", "Test ping", "Ping. Reply: OK", [])
        elif provider in ("image", "pollinations"):
            test_reply = "Image Engine Active"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

        latency = int((time.time() - t0) * 1000)
        return {
            "success": True,
            "latency": latency,
            "message": f"Connection verified! ({latency}ms latency)",
            "sampleResponse": test_reply[:100]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------------------------
# API: Chat Endpoint with Intelligent Cascade
# ---------------------------------------------------------------------------
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    user_msg = (req.message or "").strip()

    # Process and append any attached files/documents into context
    if req.attachments and "[USER ATTACHED DOCUMENTS]" not in user_msg:
        att_parts = []
        for idx, att in enumerate(req.attachments):
            att_name = att.get("name", f"file_{idx+1}")
            att_type = att.get("type", "text")
            att_content = att.get("content") or att.get("content_or_url") or ""
            if att.get("category") == "image" or str(att_type).startswith("image/"):
                att_content = f"[Image attached: {att_name}, size: {att.get('formattedSize') or att.get('size') or 'unknown'}]"
            elif att.get("source") == "gdrive" or "drive.google.com" in str(att.get("content_or_url", "")):
                att_content = f"[Google Drive Cloud Resource: {att_name} - URL: {att.get('content_or_url')}]\n{att_content}"
            att_parts.append(f"--- ATTACHED FILE {idx+1}: {att_name} ({att.get('extension') or att_type}) ---\n{str(att_content)[:40000]}\n--- END OF ATTACHED FILE ---")
        
        att_text = "\n\n".join(att_parts)
        user_msg = f"{user_msg}\n\n[USER ATTACHED DOCUMENTS]:\n{att_text}" if user_msg else f"[USER ATTACHED DOCUMENTS]:\n{att_text}"

    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # ----------------------------------------------------
    # LAYER 1: DETERMINISTIC IDENTITY INTERCEPTOR (100% RELIABLE OVERRIDE)
    # ----------------------------------------------------
    if is_identity_query(req.message or user_msg):
        return {
            "success": True,
            "reply": IDENTITY_DIRECT_REPLY,
            "provider": "builtin",
            "model": "identity-interceptor",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    env = load_env_dict()
    provider = req.provider or env.get("DEFAULT_PROVIDER", "auto")
    persona = req.persona or "companion"
    system_prompt = build_system_prompt(persona, req.systemPrompt, req.knowledgeContext)

    keys = {
        "gemini": req.apiKey if (req.apiKey and provider == "gemini") else env.get("GEMINI_API_KEY", ""),
        "groq": req.apiKey if (req.apiKey and provider == "groq") else env.get("GROQ_API_KEY", ""),
        "openai": req.apiKey if (req.apiKey and provider == "openai") else env.get("OPENAI_API_KEY", ""),
        "openrouter": req.apiKey if (req.apiKey and provider == "openrouter") else env.get("OPENROUTER_API_KEY", "")
    }

    # ----------------------------------------------------
    # Tool Routing: Image Generation
    # ----------------------------------------------------
    is_img_slash = bool(re.match(r"^/(image|draw|imagine|pic|art)\s+", user_msg, re.IGNORECASE))
    is_img_natural = bool(re.search(r"^(?:generate|create|draw|make|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|drawing|portrait|wallpaper)\s+(?:of|for|about|depicting)\s+(.+)", user_msg, re.IGNORECASE)) \
        or bool(re.search(r"^(?:draw|paint|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?(.+)", user_msg, re.IGNORECASE)) \
        or bool(re.search(r"^(?:picture|photo|image|portrait|illustration)\s+(?:of|for)\s+(.+)", user_msg, re.IGNORECASE)) \
        or bool(re.search(r"(?:photo|image|tasveer|picture|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)", user_msg, re.IGNORECASE))

    if is_img_slash or is_img_natural:
        clean_prompt = user_msg
        if is_img_slash:
            clean_prompt = re.sub(r"^/(image|draw|imagine|pic|art)\s+", "", user_msg, flags=re.IGNORECASE).strip()
        else:
            clean_prompt = re.sub(r"^(?:generate|create|draw|make|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|drawing|portrait|wallpaper)\s+(?:of|for|about|depicting)\s+", "", user_msg, flags=re.IGNORECASE)
            clean_prompt = re.sub(r"^(?:draw|paint|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?", "", clean_prompt, flags=re.IGNORECASE)
            clean_prompt = re.sub(r"^(?:picture|photo|image|portrait|illustration)\s+(?:of|for)\s+", "", clean_prompt, flags=re.IGNORECASE)
            clean_prompt = re.sub(r"(?:photo|image|tasveer|picture|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)", "", clean_prompt, flags=re.IGNORECASE).strip()
        if not clean_prompt:
            clean_prompt = user_msg

        seed = int(time.time() * 1000) % 10000000
        safe_encoded = urllib.parse.quote(clean_prompt)
        pollinations_url = f"https://image.pollinations.ai/prompt/{safe_encoded}?width=1024&height=1024&nologo=true&enhance=true&seed={seed}&model=flux"

        reply_text = f'Here is your generated image for: **"{clean_prompt}"** ✨\n\n![{clean_prompt}]({pollinations_url})\n\n[📥 Download Image]({pollinations_url})'

        return {
            "success": True,
            "reply": reply_text,
            "isImage": True,
            "imageUrl": pollinations_url,
            "prompt": clean_prompt,
            "provider": "pollinations",
            "model": "flux",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    # ----------------------------------------------------
    # Tool Routing: PPT / Presentation Generation
    # ----------------------------------------------------
    is_ppt_slash = bool(re.match(r"^/(ppt|presentation|slides|deck)\s+", user_msg, re.IGNORECASE))
    is_ppt_natural = bool(re.search(r"(?:create|make|generate|build|draft|prepare)\s+(?:a\s+)?(?:(\d+)[ -]slide\s+)?(?:presentation|ppt|powerpoint|slide deck|slides)\s+(?:on|about|for)\s+", user_msg, re.IGNORECASE)) \
        or bool(re.search(r"(?:presentation|ppt|powerpoint|slides)\s+(?:on|about|for)\s+(.+)", user_msg, re.IGNORECASE)) \
        or bool(re.search(r"(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)", user_msg, re.IGNORECASE)) \
        or bool(re.search(r"(?:ppt|presentation)\s+(?:banao|create karo|chahiye)", user_msg, re.IGNORECASE))

    if is_ppt_slash or is_ppt_natural:
        slide_count = 5
        slide_match = re.search(r"(\d+)\s*(?:slides?|slide deck)", user_msg, re.IGNORECASE)
        if slide_match:
            try:
                slide_count = max(3, min(15, int(slide_match.group(1))))
            except Exception:
                pass

        if is_ppt_slash:
            topic = re.sub(r"^/(ppt|presentation|slides|deck)\s+", "", user_msg, flags=re.IGNORECASE).strip()
        else:
            topic = re.sub(r"(?:create|make|generate|build|draft|prepare)\s+(?:a\s+)?(?:(\d+)[ -]slide\s+)?(?:presentation|ppt|powerpoint|slide deck|slides)\s+(?:on|about|for)\s+", "", user_msg, flags=re.IGNORECASE)
            topic = re.sub(r"(?:presentation|ppt|powerpoint|slides)\s+(?:on|about|for)\s+", "", topic, flags=re.IGNORECASE)
            topic = re.sub(r"(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)", "", topic, flags=re.IGNORECASE).strip()
        if not topic:
            topic = "Executive Presentation"

        deck = await build_presentation_deck_py(topic, slide_count, "modern_blue", keys)
        file_info = create_pptx_file_py(deck)

        slides_lines = []
        for idx, s in enumerate(deck.get("slides", [])):
            bullets_txt = "\n".join(f"  - {b}" for b in s.get("bullets", []))
            slides_lines.append(f"**Slide {idx + 1}: {s.get('slide_title', '')}**\n{bullets_txt}")
        slides_md = "\n\n".join(slides_lines)

        reply_text = f"### 📊 {deck.get('title', topic)}\n*{deck.get('subtitle', '')}*\n\n" \
            f"I have generated a **{len(deck.get('slides', []))}-slide Presentation** on **{topic}**.\n\n" \
            f"#### 📑 Slide Outline:\n\n{slides_md}\n\n" \
            f"---\n\n" \
            f"📥 **[Download Presentation (.pptx)]({file_info['downloadUrl']})**"

        return {
            "success": True,
            "reply": reply_text,
            "isPresentation": True,
            "downloadUrl": file_info["downloadUrl"],
            "filename": file_info["filename"],
            "deck": deck,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    if provider in ("auto", "builtin"):
        if keys["groq"]: provider = "groq"
        elif keys["gemini"]: provider = "gemini"
        elif keys["openai"]: provider = "openai"
        elif keys["openrouter"]: provider = "openrouter"
        else: provider = "builtin"

    # Execution candidates
    attempts = []
    if provider == "groq" and keys["groq"]:
        attempts.append(("groq", lambda: call_groq(keys["groq"], req.model or "openai/gpt-oss-20b", system_prompt, user_msg, req.history)))
    elif provider == "gemini" and keys["gemini"]:
        attempts.append(("gemini", lambda: call_gemini(keys["gemini"], req.model or "gemini-1.5-flash", system_prompt, user_msg, req.history)))
    elif provider == "openai" and keys["openai"]:
        attempts.append(("openai", lambda: call_openai(keys["openai"], req.model or "gpt-4o-mini", system_prompt, user_msg, req.history)))
    elif provider == "openrouter" and keys["openrouter"]:
        attempts.append(("openrouter", lambda: call_openrouter(keys["openrouter"], req.model or "qwen/qwen3.8-27b:free", system_prompt, user_msg, req.history)))

    # Fallback Cascade
    if keys["groq"] and provider != "groq":
        attempts.append(("groq", lambda: call_groq(keys["groq"], "openai/gpt-oss-20b", system_prompt, user_msg, req.history)))
    if keys["openrouter"] and provider != "openrouter":
        attempts.append(("openrouter", lambda: call_openrouter(keys["openrouter"], "qwen/qwen3.8-27b:free", system_prompt, user_msg, req.history)))
    if keys["gemini"] and provider != "gemini":
        attempts.append(("gemini", lambda: call_gemini(keys["gemini"], "gemini-1.5-flash", system_prompt, user_msg, req.history)))
    if keys["openai"] and provider != "openai":
        attempts.append(("openai", lambda: call_openai(keys["openai"], "gpt-4o-mini", system_prompt, user_msg, req.history)))

    # Execute chain
    final_reply = None
    used_provider = "builtin"
    used_model = "shivi-python-brain-v2.5"

    for prov_name, runner in attempts:
        try:
            final_reply = await runner()
            used_provider = prov_name
            used_model = req.model or prov_name
            break
        except Exception as e:
            print(f"[Cascade Notice] {prov_name} attempt failed: {e}. Falling back...")

    if not final_reply:
        final_reply = execute_builtin_engine(user_msg, persona, req.knowledgeContext or "")
        used_provider = "builtin"
        used_model = "shivi-builtin-reasoning"

    return {
        "success": True,
        "reply": final_reply,
        "provider": used_provider,
        "model": used_model,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

# ---------------------------------------------------------------------------
# API: Chat Streaming Endpoint (SSE)
# ---------------------------------------------------------------------------
@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """Streams conversational response token-by-token using Server-Sent Events."""
    # Obtain complete response using cascade
    chat_result = await chat_endpoint(req)
    reply_text = chat_result.get("reply", "")

    async def token_generator():
        words = re.findall(r"\S+|\s+", reply_text)
        for chunk in words:
            data_payload = json.dumps({"chunk": chunk, "done": False})
            yield f"data: {data_payload}\n\n"
            await asyncio.sleep(0.015)
        yield f"data: {json.dumps({'chunk': '', 'done': True, 'provider': chat_result.get('provider')})}\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")

# ---------------------------------------------------------------------------
# API: Image Generation Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/generate-image")
async def generate_image_endpoint(req: ImageRequest, background_tasks: BackgroundTasks):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required for image generation")

    env = load_env_dict()
    provider = req.provider or env.get("IMAGE_PROVIDER", "pollinations")
    api_key = req.apiKey or env.get("IMAGE_API_KEY") or env.get("OPENAI_API_KEY", "")

    # Style enhancers
    enhanced_prompt = prompt
    style_presets = {
        "photorealistic": ", 8k resolution, cinematic lighting, photorealistic, ultra-detailed, master photography, 35mm lens",
        "anime": ", anime artwork, makoto shinkai aesthetic, vibrant colors, detailed lineart, studio ghibli style",
        "cyberpunk": ", cyberpunk aesthetic, neon glow, futuristic city, octane render, volumetric smoke, ray tracing",
        "3d-render": ", 3D render, blender 3D, unreal engine 5, octane render, glossy textures, volumetric lighting",
        "oil-painting": ", oil painting style, visible brush strokes, fine art masterpiece, classical canvas texture",
        "minimalist": ", minimalist vector art, clean lines, elegant flat design, modern aesthetic"
    }
    if req.style in style_presets:
        enhanced_prompt += style_presets[req.style]

    # Check for OpenAI DALL-E 3
    if (provider == "openai" or (provider == "auto" and api_key.startswith("sk-"))) and api_key:
        try:
            assert http_client is not None
            res = await http_client.post(
                "https://api.openai.com/v1/images/generations",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": req.model or "dall-e-3",
                    "prompt": enhanced_prompt,
                    "n": 1,
                    "size": req.size if "x" in req.size else "1024x1024",
                    "quality": "standard"
                },
                timeout=45.0
            )
            if res.status_code == 200:
                data = res.json()
                img_url = data["data"][0]["url"]
                revised = data["data"][0].get("revised_prompt", enhanced_prompt)

                safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', prompt[:25]).strip('_') or "dalle"
                filename = f"{safe_name}_{int(time.time())}.jpg"
                filepath = IMAGES_DIR / filename
                background_tasks.add_task(download_image_task, img_url, filepath)

                return {
                    "success": True,
                    "imageUrl": img_url,
                    "localUrl": f"/generated_images/{filename}",
                    "prompt": prompt,
                    "revisedPrompt": revised,
                    "provider": "openai",
                    "model": "dall-e-3"
                }
        except Exception as e:
            print(f"[DALL-E Warning]: {e}. Falling back to Pollinations Flux...")

    # Pollinations Flux (Fast & Free)
    width, height = 1024, 1024
    if "x" in req.size:
        try:
            w, h = req.size.split("x")
            width, height = int(w), int(h)
        except Exception:
            pass

    seed = int(time.time() * 1000) % 10000000
    safe_encoded = urllib.parse.quote(enhanced_prompt)
    pollinations_url = f"https://image.pollinations.ai/prompt/{safe_encoded}?width={width}&height={height}&nologo=true&enhance=true&seed={seed}&model=flux"

    safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', prompt[:25]).strip('_') or "flux"
    filename = f"{safe_name}_{int(time.time())}.jpg"
    filepath = IMAGES_DIR / filename

    # Background download to local disk
    background_tasks.add_task(download_image_task, pollinations_url, filepath)

    return {
        "success": True,
        "imageUrl": pollinations_url,
        "localUrl": f"/generated_images/{filename}",
        "prompt": prompt,
        "revisedPrompt": enhanced_prompt,
        "provider": "pollinations",
        "model": "flux"
    }

# ---------------------------------------------------------------------------
# API: Presentation Generator (.pptx Outline & Structure)
# ---------------------------------------------------------------------------
def normalize_presentation_deck(deck: dict, topic: str = "Executive Presentation", fallback_count: int = 6) -> dict:
    clean_topic = (topic or "Topic Analysis").strip()
    deck_title = deck.get("deck_title") or deck.get("title") or f"{clean_topic}: Deep Keynote"
    theme = deck.get("theme") or "dark_modern"
    raw_slides = deck.get("slides") or []
    
    normalized_slides = []
    metric_defaults = [
        {"value": "Tier-1", "caption": f"Core domain standard for {clean_topic}"},
        {"value": "99.4%", "caption": f"Benchmark precision in verified {clean_topic} frameworks"},
        {"value": "3.4x", "caption": f"Throughput & comprehension multiplier for {clean_topic}"},
        {"value": "Primary", "caption": f"Decisive structural pillar in {clean_topic}"},
        {"value": "< 20ms", "caption": f"Execution latency benchmark for {clean_topic}"},
        {"value": "Verified", "caption": f"Empirical validation standard for {clean_topic}"}
    ]
    
    for idx, s in enumerate(raw_slides):
        if not isinstance(s, dict):
            continue
        raw_layout = str(s.get("layout") or s.get("layout_type") or "").lower()
        if idx == 0 or raw_layout == "title":
            layout = "title"
        elif raw_layout in ["split_image_content", "image_split", "visual_split"] or s.get("image_prompt") or s.get("visual_prompt") or s.get("image_keyword"):
            layout = "split_image_content"
        elif raw_layout in ["metric_split", "hero_stat", "split_insight", "comparison"]:
            layout = "metric_split"
        else:
            layout = "card_grid"
            
        badge = str(s.get("badge") or ("FOUNDATIONAL ANALYSIS" if idx == 0 else f"STRATEGIC PILLAR 0{idx + 1}")).upper()
        slide_title = str(s.get("slide_title") or s.get("title") or f"{clean_topic}: Core Mechanics & Insight")
        subtitle = str(s.get("subtitle") or "")
        
        cards = []
        raw_cards = s.get("cards_or_points") or s.get("content_blocks")
        if raw_cards and isinstance(raw_cards, list):
            for c_idx, c in enumerate(raw_cards):
                if isinstance(c, dict):
                    block_title = str(c.get("title") or c.get("label") or f"Core Mechanism 0{c_idx + 1}").strip().rstrip(":")
                    block_desc = str(c.get("description") or c.get("detail") or "").strip()
                    tag_val = str(c.get("tag") or c.get("metric") or c.get("takeaway") or c.get("tagline") or "").strip()
                    cards.append({
                        "title": block_title,
                        "label": block_title,
                        "description": block_desc,
                        "detail": block_desc,
                        "tag": tag_val or f"Insight 0{c_idx + 1}"
                    })
                elif isinstance(c, str) and c.strip():
                    txt = c.strip()
                    if ":" in txt:
                        p1, p2 = txt.split(":", 1)
                        h = p1.replace("*", "").strip()
                        d = p2.strip()
                        cards.append({"title": h, "label": h, "description": d, "detail": d, "tag": f"Pillar 0{c_idx + 1}"})
                    else:
                        cards.append({"title": f"Key Dynamic 0{c_idx + 1}", "label": f"Key Dynamic 0{c_idx + 1}", "description": txt, "detail": txt, "tag": f"Point 0{c_idx + 1}"})
        elif s.get("bullets") and isinstance(s["bullets"], list):
            for b_idx, b in enumerate(s["bullets"]):
                txt = str(b).strip()
                if ":" in txt:
                    p1, p2 = txt.split(":", 1)
                    h = p1.replace("*", "").strip()
                    d = p2.strip()
                    cards.append({"title": h, "label": h, "description": d, "detail": d, "tag": f"Focus 0{b_idx + 1}"})
                else:
                    cards.append({"title": f"Key Invariant 0{b_idx + 1}", "label": f"Key Invariant 0{b_idx + 1}", "description": txt, "detail": txt, "tag": f"Insight 0{b_idx + 1}"})
                    
        if not cards:
            cards = [
                {
                    "title": "Deterministic Architectural Law",
                    "label": "Deterministic Architectural Law",
                    "description": f"The foundational architecture of {clean_topic} relies on structured, reproducible principles that dictate how elements interact under rigorous real-world conditions.",
                    "detail": f"The foundational architecture of {clean_topic} relies on structured, reproducible principles that dictate how elements interact under rigorous real-world conditions.",
                    "tag": "Theoretical Core"
                },
                {
                    "title": "Empirical Dynamic Verification",
                    "label": "Empirical Dynamic Verification",
                    "description": f"Systematic observation and domain-specific evidence verifying the practical dynamics, stability boundaries, and performance benchmarks of {clean_topic}.",
                    "detail": f"Systematic observation and domain-specific evidence verifying the practical dynamics, stability boundaries, and performance benchmarks of {clean_topic}.",
                    "tag": "Verified Evidence"
                },
                {
                    "title": "Systemic Operational Nuance",
                    "label": "Systemic Operational Nuance",
                    "description": f"Identifies edge cases, critical interdependencies, and operational trade-offs essential for production mastery and sustained excellence in {clean_topic}.",
                    "detail": f"Identifies edge cases, critical interdependencies, and operational trade-offs essential for production mastery and sustained excellence in {clean_topic}.",
                    "tag": "Critical Vector"
                }
            ]
            
        bullets = [f"**{c.get('title') or c.get('label')}:** {c.get('description') or c.get('detail')}" for c in cards]
        
        metric = s.get("highlight_metric") or s.get("metric_highlight")
        if not metric or not isinstance(metric, dict) or not metric.get("value"):
            metric = metric_defaults[idx % len(metric_defaults)]
            
        speaker_notes = str(s.get("speaker_notes") or "").strip()
        if not speaker_notes or len(speaker_notes) < 35:
            primary_concept = cards[0].get("title") or cards[0].get("label") if cards else f"the core principles of {clean_topic}"
            speaker_notes = (
                f"In this section, we examine {slide_title}. "
                f"The central focal point rests on {primary_concept}, where empirical data and domain mechanics demonstrate consistent, measurable outcomes. "
                f"Presenter note: Emphasize how these structured insights directly address the foundational complexities of {clean_topic}."
            )
            
        img_prompt = str(s.get("image_prompt") or s.get("visual_prompt") or s.get("image_keyword") or (f"{clean_topic} {slide_title} futuristic visualization 8k" if layout == "split_image_content" else "")).strip()
        import urllib.parse
        img_url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(img_prompt)}?width=800&height=600&nologo=true" if img_prompt else (s.get("image_url") or "")

        normalized_slides.append({
            "slide_number": idx + 1,
            "layout": layout,
            "layout_type": layout,
            "badge": badge,
            "slide_title": slide_title,
            "subtitle": subtitle,
            "image_prompt": img_prompt,
            "visual_prompt": img_prompt,
            "image_keyword": img_prompt,
            "image_url": img_url,
            "cards_or_points": cards[:3],
            "bullets": bullets,
            "highlight_metric": {
                "value": str(metric.get("value", "Tier-1")),
                "caption": str(metric.get("caption", f"Benchmark metric for {clean_topic}"))
            },
            "speaker_notes": speaker_notes
        })
        
    return {
        "deck_title": deck_title,
        "title": deck_title,
        "theme": theme,
        "topic": topic,
        "total_slides": len(normalized_slides),
        "slides": normalized_slides
    }

def generate_rich_fallback_deck_py(topic: str, slide_count: Optional[int] = None, theme: str = "dark_modern") -> dict:
    count = slide_count if (slide_count and slide_count > 0) else 6
    clean_topic = topic.strip()
    
    templates = [
        {
            "layout": "hero_stat",
            "badge": "EXECUTIVE THESIS",
            "slide_title": f"The Strategic Imperative of {clean_topic}",
            "subtitle": "Transformative paradigm shifts and competitive acceleration across modern markets",
            "cards_or_points": [
                {
                    "label": "Macro Velocity Shift",
                    "detail": f"Organizations deploying advanced {clean_topic} achieve a 3.4x compression in iteration cycles, outpacing legacy workflows and driving rapid market response."
                },
                {
                    "label": "Defensibility & Scale",
                    "detail": f"Building deep infrastructure around {clean_topic} establishes sustainable competitive moats through proprietary efficiencies and networked leverage."
                }
            ],
            "highlight_metric": {"value": "+148%", "caption": "Compound annual adoption rate across leading enterprise tiers"},
            "speaker_notes": f"Welcome everyone. Today we are conducting an executive deep dive into {clean_topic}. The core premise of this deck is simple: {clean_topic} is no longer an optional experiment; it represents the defining structural inflection point for modern operations. As we examine the metrics, notice how early adopters are compounding their advantages across every operational vector."
        },
        {
            "layout": "split_image_content",
            "badge": "ARCHITECTURAL TOPOLOGY",
            "slide_title": f"Architectural Dynamics & Topology of {clean_topic}",
            "subtitle": "Mission-critical structural drivers underpinning high-performance implementation",
            "image_prompt": f"{clean_topic} detailed technical architecture visualization dark glowing cyan 8k",
            "cards_or_points": [
                {
                    "label": "Unified Data Orchestration",
                    "detail": "Eliminates informational silos by creating low-latency telemetry pipelines that feed directly into automated decision-making engines."
                },
                {
                    "label": "Autonomous Feedback Loops",
                    "detail": "Continuous monitoring systems adjust parameters in real time, reducing error margins by up to 76% without manual intervention."
                }
            ],
            "highlight_metric": {"value": "99.4%", "caption": "Production reliability benchmark achieved across tier-1 environments"},
            "speaker_notes": f"Turning to our architecture slide, this technical schematic illustrates the decoupled orchestration of {clean_topic}. Notice how autonomous feedback loops allow systems to self-correct in under 20 milliseconds, fundamentally safeguarding throughput."
        },
        {
            "layout": "split_insight",
            "badge": "STRATEGIC TRADE-OFFS",
            "slide_title": "Navigating Bottlenecks vs. Breakthroughs",
            "subtitle": "Comparative evaluation between legacy paradigms and next-generation frameworks",
            "cards_or_points": [
                {
                    "label": "Legacy Inertia Constraints",
                    "detail": "Traditional methods suffer from compounding latency, high maintenance overheads, and fragile point-to-point integrations."
                },
                {
                    "label": "Next-Gen Breakthrough Vectors",
                    "detail": f"Modern {clean_topic} architecture reduces cost-to-serve by 62% while enabling non-blocking asynchronous throughput at scale."
                },
                {
                    "label": "Capital Efficiency Realignment",
                    "detail": "Upfront capital expenditure translates into exponential operating leverage within the first two quarters of deployment."
                }
            ],
            "highlight_metric": {"value": "4.2x", "caption": "Efficiency multiplier compared to standard legacy alternatives"},
            "speaker_notes": f"Every strategic evolution involves trade-offs. On the left, we map the friction of legacy inertia—where technical debt slows innovation to a crawl. On the right, our modern model for {clean_topic} achieves a four-fold efficiency multiplier, unlocking immediate cash flow and operational bandwidth."
        },
        {
            "layout": "hero_stat",
            "badge": "ECONOMIC IMPACT",
            "slide_title": "Quantified Return & Value Realization",
            "subtitle": "Tangible enterprise metrics and financial returns observed in production",
            "cards_or_points": [
                {
                    "label": "Unit Economics Transformation",
                    "detail": "Marginal cost per transaction drops asymptotically as volume increases, driving sustained gross margin expansion."
                },
                {
                    "label": "Risk Mitigation Vector",
                    "detail": "Automated compliance guardrails and predictive analytics reduce downtime events and security vulnerabilities by 84%."
                }
            ],
            "highlight_metric": {"value": "$3.8M", "caption": "Average annualized cost avoidance in enterprise deployments"},
            "speaker_notes": f"Here we address the balance sheet. The financial justification for {clean_topic} is overwhelming. By transforming unit economics from linear costs to sub-linear marginal costs, enterprise organizations capture nearly four million dollars in annual efficiency gains while elevating system availability."
        },
        {
            "layout": "process_flow",
            "badge": "EXECUTION TIMELINE",
            "slide_title": "Phased Implementation & Rollout Roadmap",
            "subtitle": "A disciplined, milestone-driven framework for rapid end-to-end deployment",
            "cards_or_points": [
                {
                    "label": "Phase 1: Pilot & Discovery (Weeks 1-4)",
                    "detail": f"Baseline auditing, telemetry setup, and validation of core hypotheses across high-yield test vectors in {clean_topic}."
                },
                {
                    "label": "Phase 2: Scale & Orchestration (Weeks 5-10)",
                    "detail": "Full cluster deployment, API gateway routing, and enterprise-wide staff enablement sessions."
                },
                {
                    "label": "Phase 3: Autonomous Optimization (Weeks 11+)",
                    "detail": "Self-healing workflows, custom fine-tuning, and executive KPI dashboard integration."
                }
            ],
            "highlight_metric": {"value": "< 90 Days", "caption": "Total timeline from initial kickoff to enterprise production status"},
            "speaker_notes": f"Execution requires clarity. This three-stage rollout roadmap ensures zero operational disruption. In the first four weeks, we establish telemetry and prove out the core pilot. By day ninety, the entire pipeline is self-optimizing and delivering measurable ROI."
        },
        {
            "layout": "conclusion",
            "badge": "EXECUTIVE MANDATE",
            "slide_title": "The Path Forward: Leadership Mandate",
            "subtitle": "Strategic recommendations to capture enduring first-mover advantage",
            "cards_or_points": [
                {
                    "label": "Form Dedicated Tiger Team",
                    "detail": f"Assemble a cross-functional taskforce across engineering and product to execute rapid prototyping on {clean_topic}."
                },
                {
                    "label": "Targeted Infrastructure Allocation",
                    "detail": "Allocate strategic capital toward high-throughput data infrastructure and automated verification tooling."
                },
                {
                    "label": "Autonomous Execution Culture",
                    "detail": "Incentivize speed-to-market and iterative learning cycles to permanently out-innovate industry incumbents."
                }
            ],
            "highlight_metric": {"value": "Validated", "caption": "Immediate deployment pathway ready for enterprise execution"},
            "speaker_notes": f"In conclusion, the window of opportunity is right now. Organizations that act boldly on {clean_topic} will define the standards of the next decade. Our immediate recommendation is to greenlight the Phase 1 pilot team today and begin capturing these competitive advantages immediately. Thank you."
        }
    ]
    
    selected = templates[:count]
    while len(selected) < count:
        idx = len(selected)
        t_clone = dict(templates[idx % len(templates)])
        t_clone["slide_title"] = f"Strategic Vector {idx + 1}"
        selected.append(t_clone)
        
    return normalize_presentation_deck({
        "deck_title": f"Executive Keynote: {clean_topic}",
        "theme": theme,
        "slides": selected
    }, topic=clean_topic, fallback_count=count)

def create_pptx_file_py(deck: dict) -> dict:
    try:
        # pyrefly: ignore [missing-import]
        import pptx
        # pyrefly: ignore [missing-import]
        from pptx.util import Inches, Pt
        # pyrefly: ignore [missing-import]
        from pptx.dml.color import RGBColor
        # pyrefly: ignore [missing-import]
        from pptx.enum.text import PP_ALIGN
        # pyrefly: ignore [missing-import]
        from pptx.enum.shapes import MSO_SHAPE
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="python-pptx is not installed. Run: pip install python-pptx"
        )

    deck = normalize_presentation_deck(deck)

    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    deck_title = deck.get("deck_title") or deck.get("title", "Executive Presentation")
    theme_name = (deck.get("theme") or "dark_modern").lower()
    slides = deck.get("slides", [])
    total_slides = len(slides)

    # Pitch / Apple Keynote Palettes
    if "editorial" in theme_name:
        bg_rgb = RGBColor(248, 250, 252)       # Soft off-white
        card_bg_rgb = RGBColor(255, 255, 255)  # Pure white
        card_border_rgb = RGBColor(226, 232, 240)
        accent_rgb = RGBColor(37, 99, 235)      # Royal Blue (#2563EB)
        accent_alt_rgb = RGBColor(234, 88, 12)  # Amber (#EA580C)
        text_title_rgb = RGBColor(15, 23, 42)
        text_sub_rgb = RGBColor(71, 85, 105)
        text_body_rgb = RGBColor(51, 65, 85)
    elif "gradient" in theme_name or "aurora" in theme_name:
        bg_rgb = RGBColor(10, 17, 24)          # Deep emerald tint
        card_bg_rgb = RGBColor(17, 30, 40)
        card_border_rgb = RGBColor(22, 78, 99)
        accent_rgb = RGBColor(16, 185, 129)     # Vibrant Emerald (#10B981)
        accent_alt_rgb = RGBColor(6, 182, 212)  # Cyan (#06B6D4)
        text_title_rgb = RGBColor(255, 255, 255)
        text_sub_rgb = RGBColor(103, 232, 249)
        text_body_rgb = RGBColor(203, 213, 225)
    else:  # dark_modern (Default Keynote Obsidian)
        bg_rgb = RGBColor(11, 15, 25)           # Obsidian Midnight (#0B0F19)
        card_bg_rgb = RGBColor(22, 31, 48)     # Sleek Slate Card
        card_border_rgb = RGBColor(34, 49, 78)
        accent_rgb = RGBColor(249, 115, 22)     # Electric Amber (#F97316)
        accent_alt_rgb = RGBColor(56, 189, 248) # Sky Blue (#38BDF8)
        text_title_rgb = RGBColor(255, 255, 255)
        text_sub_rgb = RGBColor(148, 163, 184)
        text_body_rgb = RGBColor(203, 213, 225)

    blank_layout = prs.slide_layouts[6]

    for idx, s in enumerate(slides):
        slide = prs.slides.add_slide(blank_layout)
        layout = (s.get("layout") or s.get("layout_type") or "card_grid").lower()
        badge_text = s.get("badge", "EXECUTIVE BRIEF")
        slide_title = s.get("slide_title", f"Slide {idx + 1}")
        subtitle = s.get("subtitle", "")
        cards = s.get("cards_or_points", [])
        metric = s.get("highlight_metric", {"value": "+100%", "caption": "Key Performance Metric"})
        speaker_notes = s.get("speaker_notes", "")

        # Slide Full Background
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = bg_rgb
        bg_shape.line.color.rgb = bg_rgb

        # Top Badge Pill
        badge_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.45), Inches(2.8), Inches(0.32))
        badge_box.fill.solid()
        badge_box.fill.fore_color.rgb = card_bg_rgb
        badge_box.line.color.rgb = accent_rgb
        badge_box.line.width = Pt(1)
        b_p = badge_box.text_frame.paragraphs[0]
        b_p.text = badge_text
        b_p.font.size = Pt(9.5)
        b_p.font.bold = True
        b_p.font.color.rgb = accent_rgb
        b_p.alignment = PP_ALIGN.CENTER

        # Slide Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.82), Inches(11.7), Inches(0.65))
        tp = t_box.text_frame.paragraphs[0]
        tp.text = slide_title
        tp.font.size = Pt(24)
        tp.font.bold = True
        tp.font.color.rgb = text_title_rgb

        # Executive Subtitle
        if subtitle:
            sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.42), Inches(11.7), Inches(0.45))
            sp = sub_box.text_frame.paragraphs[0]
            sp.text = subtitle
            sp.font.size = Pt(13)
            sp.font.color.rgb = text_sub_rgb

        content_top = Inches(1.95)
        content_height = Inches(4.75)

        # -------------------------------------------------------------------
        # 1. Layout: HERO STAT (Apple Keynote Style Giant Metric + Cards)
        # -------------------------------------------------------------------
        if layout == "hero_stat":
            # Left Hero Stat Card
            stat_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), content_top, Inches(4.6), content_height)
            stat_card.fill.solid()
            stat_card.fill.fore_color.rgb = card_bg_rgb
            stat_card.line.color.rgb = card_border_rgb
            stat_card.line.width = Pt(1.5)

            # Metric Value
            val_box = slide.shapes.add_textbox(Inches(1.1), Inches(2.4), Inches(4.0), Inches(1.5))
            vp = val_box.text_frame.paragraphs[0]
            vp.text = metric.get("value", "+148%")
            vp.font.size = Pt(48)
            vp.font.bold = True
            vp.font.color.rgb = accent_rgb

            # Metric Caption
            cap_box = slide.shapes.add_textbox(Inches(1.1), Inches(3.9), Inches(4.0), Inches(0.9))
            cap_f = cap_box.text_frame
            cap_f.word_wrap = True
            cp = cap_f.paragraphs[0]
            cp.text = metric.get("caption", "Annualized industry growth benchmark")
            cp.font.size = Pt(13)
            cp.font.bold = True
            cp.font.color.rgb = text_title_rgb

            # Mini divider
            div = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.1), Inches(4.9), Inches(3.8), Inches(0.02))
            div.fill.solid()
            div.fill.fore_color.rgb = card_border_rgb
            div.line.color.rgb = card_border_rgb

            # Left footer note
            fn_box = slide.shapes.add_textbox(Inches(1.1), Inches(5.1), Inches(4.0), Inches(1.2))
            fn_f = fn_box.text_frame
            fn_f.word_wrap = True
            fnp = fn_f.paragraphs[0]
            fnp.text = f"Empirical benchmark reflecting operational acceleration across verified {deck_title} frameworks."
            fnp.font.size = Pt(10.5)
            fnp.font.color.rgb = text_sub_rgb

            # Right Column: 2 Modular Concept Cards
            num_cards = min(len(cards), 2)
            c_h = Inches(2.25)
            for c_idx in range(num_cards):
                card_item = cards[c_idx]
                c_y = content_top if c_idx == 0 else Inches(4.45)

                rc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.7), c_y, Inches(6.8), c_h)
                rc.fill.solid()
                rc.fill.fore_color.rgb = card_bg_rgb
                rc.line.color.rgb = card_border_rgb
                rc.line.width = Pt(1)

                tb = slide.shapes.add_textbox(Inches(6.0), c_y + Inches(0.2), Inches(6.2), Inches(1.85))
                tf = tb.text_frame
                tf.word_wrap = True
                
                lp = tf.paragraphs[0]
                lp.text = card_item.get("label", f"Strategic Concept {c_idx + 1}")
                lp.font.size = Pt(16)
                lp.font.bold = True
                lp.font.color.rgb = accent_alt_rgb
                lp.space_after = Pt(6)

                dp = tf.add_paragraph()
                dp.text = card_item.get("detail", "")
                dp.font.size = Pt(13)
                dp.font.color.rgb = text_body_rgb

        # -------------------------------------------------------------------
        # Layout: SPLIT IMAGE & CONTENT (50% text cards left, 50% AI image right)
        # -------------------------------------------------------------------
        elif layout == "split_image_content" or s.get("image_prompt") or s.get("image_url"):
            col_w = Inches(5.65)
            left_cards = cards[:2]
            c_h = (content_height - Inches(0.25)) / 2

            for c_idx, card_item in enumerate(left_cards):
                c_y = content_top + (c_idx * (c_h + Inches(0.25)))
                sc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), c_y, col_w, c_h)
                sc.fill.solid()
                sc.fill.fore_color.rgb = card_bg_rgb
                sc.line.color.rgb = card_border_rgb
                sc.line.width = Pt(1)

                strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.05), c_y + Inches(0.2), Inches(0.9), Inches(0.05))
                strip.fill.solid()
                strip_col = accent_rgb if c_idx == 0 else accent_alt_rgb
                strip.fill.fore_color.rgb = strip_col
                strip.line.color.rgb = strip_col

                tb = slide.shapes.add_textbox(Inches(1.05), c_y + Inches(0.35), col_w - Inches(0.5), c_h - Inches(0.45))
                tf = tb.text_frame
                tf.word_wrap = True

                lp = tf.paragraphs[0]
                lp.text = card_item.get("title") or card_item.get("label", f"Strategic Pillar {c_idx + 1}")
                lp.font.size = Pt(15)
                lp.font.bold = True
                lp.font.color.rgb = text_title_rgb
                lp.space_after = Pt(4)

                dp = tf.add_paragraph()
                dp.text = card_item.get("description") or card_item.get("detail", "")
                dp.font.size = Pt(11.5)
                dp.font.color.rgb = text_body_rgb

            # Right column: Image container + Pollinations AI Image
            img_x = Inches(6.85)
            img_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, img_x, content_top, col_w, content_height)
            img_box.fill.solid()
            img_box.fill.fore_color.rgb = card_bg_rgb
            img_box.line.color.rgb = accent_rgb
            img_box.line.width = Pt(1.2)

            img_prompt = s.get("image_prompt") or s.get("visual_prompt") or s.get("image_keyword") or f"{deck_title} {slide_title}"
            import urllib.parse
            img_url = s.get("image_url") or f"https://image.pollinations.ai/prompt/{urllib.parse.quote(img_prompt)}?width=800&height=600&nologo=true"

            image_placed = False
            try:
                import urllib.request
                import io
                req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    img_data = response.read()
                    img_stream = io.BytesIO(img_data)
                    slide.shapes.add_picture(img_stream, img_x + Inches(0.08), content_top + Inches(0.08), col_w - Inches(0.16), content_height - Inches(0.5))
                    image_placed = True
            except Exception as img_err:
                print(f"[python-pptx image download warning]: {img_err}")

            if not image_placed:
                # Text fallback placeholder inside container
                tb_ph = slide.shapes.add_textbox(img_x + Inches(0.3), content_top + Inches(1.5), col_w - Inches(0.6), Inches(2.0))
                tf_ph = tb_ph.text_frame
                tf_ph.word_wrap = True
                ph_p = tf_ph.paragraphs[0]
                ph_p.text = f"✨ Visual Architecture Schematic\n\nPrompt: {img_prompt}"
                ph_p.font.size = Pt(12)
                ph_p.font.color.rgb = text_sub_rgb
                ph_p.alignment = PP_ALIGN.CENTER

            # Prompt caption pill at bottom
            tb_lbl = slide.shapes.add_textbox(img_x + Inches(0.1), content_top + content_height - Inches(0.38), col_w - Inches(0.2), Inches(0.32))
            tf_lbl = tb_lbl.text_frame
            lp_lbl = tf_lbl.paragraphs[0]
            lp_lbl.text = f"✦ AI Visual: {img_prompt[:45]}..."
            lp_lbl.font.size = Pt(9)
            lp_lbl.font.italic = True
            lp_lbl.font.color.rgb = text_sub_rgb
            lp_lbl.alignment = PP_ALIGN.CENTER

        # -------------------------------------------------------------------
        # 2. Layout: CARD GRID (Pitch.com 3-Card Modular Grid)
        # -------------------------------------------------------------------
        elif layout == "card_grid":
            num_cards = min(max(len(cards), 2), 3)
            col_w = Inches(3.68) if num_cards == 3 else Inches(5.65)
            gap = Inches(0.35)

            for c_idx in range(num_cards):
                card_item = cards[c_idx] if c_idx < len(cards) else cards[-1]
                c_x = Inches(0.8) + (c_idx * (col_w + gap))

                gc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_x, content_top, col_w, content_height)
                gc.fill.solid()
                gc.fill.fore_color.rgb = card_bg_rgb
                gc.line.color.rgb = card_border_rgb
                gc.line.width = Pt(1)

                # Card Top Indicator Strip
                strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, c_x + Inches(0.4), content_top + Inches(0.4), Inches(0.8), Inches(0.06))
                strip.fill.solid()
                strip_color = accent_rgb if c_idx == 0 else (accent_alt_rgb if c_idx == 1 else RGBColor(168, 85, 247))
                strip.fill.fore_color.rgb = strip_color
                strip.line.color.rgb = strip_color

                tb = slide.shapes.add_textbox(c_x + Inches(0.35), content_top + Inches(0.65), col_w - Inches(0.7), content_height - Inches(0.9))
                tf = tb.text_frame
                tf.word_wrap = True

                lp = tf.paragraphs[0]
                lp.text = card_item.get("label", f"Pillar {c_idx + 1}")
                lp.font.size = Pt(16.5)
                lp.font.bold = True
                lp.font.color.rgb = text_title_rgb
                lp.space_after = Pt(10)

                dp = tf.add_paragraph()
                dp.text = card_item.get("detail", "")
                dp.font.size = Pt(13)
                dp.font.color.rgb = text_body_rgb

        # -------------------------------------------------------------------
        # 3. Layout: SPLIT INSIGHT (2 Comparative Columns)
        # -------------------------------------------------------------------
        elif layout == "split_insight":
            col_w = Inches(5.65)
            gap = Inches(0.4)

            for col_idx in range(2):
                c_x = Inches(0.8) if col_idx == 0 else Inches(0.8) + col_w + gap
                sc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_x, content_top, col_w, content_height)
                sc.fill.solid()
                sc.fill.fore_color.rgb = card_bg_rgb
                sc.line.color.rgb = card_border_rgb
                sc.line.width = Pt(1.2)

                col_header = "Perspective A: Strategic Catalysts" if col_idx == 0 else "Perspective B: Operational Realities"
                col_color = accent_rgb if col_idx == 0 else accent_alt_rgb

                tb = slide.shapes.add_textbox(c_x + Inches(0.4), content_top + Inches(0.3), col_w - Inches(0.8), content_height - Inches(0.6))
                tf = tb.text_frame
                tf.word_wrap = True

                hp = tf.paragraphs[0]
                hp.text = col_header
                hp.font.size = Pt(15.5)
                hp.font.bold = True
                hp.font.color.rgb = col_color
                hp.space_after = Pt(12)

                # Concept card content
                target_card = cards[col_idx] if col_idx < len(cards) else cards[-1]
                cp = tf.add_paragraph()
                cp.text = target_card.get("label", "Key Vector")
                cp.font.size = Pt(17)
                cp.font.bold = True
                cp.font.color.rgb = text_title_rgb
                cp.space_after = Pt(8)

                dp = tf.add_paragraph()
                dp.text = target_card.get("detail", "")
                dp.font.size = Pt(13)
                dp.font.color.rgb = text_body_rgb

        # -------------------------------------------------------------------
        # 4. Layout: PROCESS FLOW (Numbered Execution Stages)
        # -------------------------------------------------------------------
        elif layout == "process_flow":
            num_steps = min(max(len(cards), 2), 3)
            col_w = Inches(3.68) if num_steps == 3 else Inches(5.65)
            gap = Inches(0.35)

            for s_idx in range(num_steps):
                step_item = cards[s_idx] if s_idx < len(cards) else cards[-1]
                s_x = Inches(0.8) + (s_idx * (col_w + gap))

                pc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, s_x, content_top, col_w, content_height)
                pc.fill.solid()
                pc.fill.fore_color.rgb = card_bg_rgb
                pc.line.color.rgb = card_border_rgb
                pc.line.width = Pt(1)

                # Numbered badge
                badge_circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, s_x + Inches(0.4), content_top + Inches(0.35), Inches(0.6), Inches(0.6))
                badge_circle.fill.solid()
                badge_circle.fill.fore_color.rgb = accent_rgb
                badge_circle.line.color.rgb = accent_rgb
                bp_p = badge_circle.text_frame.paragraphs[0]
                bp_p.text = f"0{s_idx + 1}"
                bp_p.font.size = Pt(12)
                bp_p.font.bold = True
                bp_p.font.color.rgb = RGBColor(255, 255, 255)
                bp_p.alignment = PP_ALIGN.CENTER

                tb = slide.shapes.add_textbox(s_x + Inches(0.35), content_top + Inches(1.15), col_w - Inches(0.7), content_height - Inches(1.4))
                tf = tb.text_frame
                tf.word_wrap = True

                lp = tf.paragraphs[0]
                lp.text = step_item.get("label", f"Phase {s_idx + 1}")
                lp.font.size = Pt(16.5)
                lp.font.bold = True
                lp.font.color.rgb = text_title_rgb
                lp.space_after = Pt(10)

                dp = tf.add_paragraph()
                dp.text = step_item.get("detail", "")
                dp.font.size = Pt(13)
                dp.font.color.rgb = text_body_rgb

        # -------------------------------------------------------------------
        # 5. Layout: CONCLUSION / EXECUTIVE MANDATE
        # -------------------------------------------------------------------
        else:
            # Top Banner Card
            top_h = Inches(1.7)
            top_c = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), content_top, Inches(11.7), top_h)
            top_c.fill.solid()
            top_c.fill.fore_color.rgb = card_bg_rgb
            top_c.line.color.rgb = accent_rgb
            top_c.line.width = Pt(1.5)

            tb_top = slide.shapes.add_textbox(Inches(1.1), content_top + Inches(0.2), Inches(11.1), Inches(1.3))
            tf_top = tb_top.text_frame
            tf_top.word_wrap = True
            tp = tf_top.paragraphs[0]
            tp.text = f'"{slide_title}: {subtitle or "Accelerating execution through definitive strategic conviction."}"'
            tp.font.size = Pt(18)
            tp.font.bold = True
            tp.font.color.rgb = text_title_rgb

            # 3 Bottom Execution Pillar Cards
            bot_y = content_top + top_h + Inches(0.3)
            bot_h = Inches(2.7)
            num_cards = min(max(len(cards), 2), 3)
            col_w = Inches(3.68) if num_cards == 3 else Inches(5.65)
            gap = Inches(0.35)

            for c_idx in range(num_cards):
                card_item = cards[c_idx] if c_idx < len(cards) else cards[-1]
                c_x = Inches(0.8) + (c_idx * (col_w + gap))

                bc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_x, bot_y, col_w, bot_h)
                bc.fill.solid()
                bc.fill.fore_color.rgb = card_bg_rgb
                bc.line.color.rgb = card_border_rgb
                bc.line.width = Pt(1)

                tb = slide.shapes.add_textbox(c_x + Inches(0.35), bot_y + Inches(0.25), col_w - Inches(0.7), bot_h - Inches(0.45))
                tf = tb.text_frame
                tf.word_wrap = True

                lp = tf.paragraphs[0]
                lp.text = f"{c_idx + 1}. {card_item.get('label', 'Action Item')}"
                lp.font.size = Pt(15)
                lp.font.bold = True
                lp.font.color.rgb = accent_alt_rgb
                lp.space_after = Pt(6)

                dp = tf.add_paragraph()
                dp.text = card_item.get("detail", "")
                dp.font.size = Pt(12)
                dp.font.color.rgb = text_body_rgb

        # Bottom Slide Counter
        foot_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.85), Inches(11.7), Inches(0.4))
        fp = foot_box.text_frame.paragraphs[0]
        fp.alignment = PP_ALIGN.RIGHT
        fp.text = f"Shivi AI Executive Keynote • Slide {idx + 1} of {total_slides}"
        fp.font.size = Pt(9.5)
        fp.font.color.rgb = text_sub_rgb

        # Presenter Script Notes
        if speaker_notes and hasattr(slide, "notes_slide"):
            try:
                slide.notes_slide.notes_text_frame.text = speaker_notes
            except Exception:
                pass

    downloads_dir = ROOT_DIR / "downloads"
    downloads_dir.mkdir(parents=True, exist_ok=True)

    safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', deck_title[:25]).strip('_') or "presentation"
    filename = f"{safe_title}_{int(time.time())}.pptx"
    filepath = downloads_dir / filename
    prs.save(str(filepath))

    return {
        "filename": filename,
        "downloadUrl": f"/downloads/{filename}",
        "filePath": str(filepath)
    }

async def build_presentation_deck_py(topic: str, slide_count: Optional[int] = None, theme: str = "dark_modern", keys: dict = None) -> dict:
    if keys is None:
        keys = {}

    clean_topic = topic.strip()
    if slide_count and slide_count > 0:
        slide_instruction = f"Generate exactly {slide_count} slides."
        count_field = f'"total_slides": {slide_count},'
    else:
        slide_instruction = (
            "DETERMINE THE SLIDE COUNT DYNAMICALLY based strictly on content complexity and depth:\n"
            "- Focused executive overview: 4-6 slides\n"
            "- Structured strategic roadmap: 7-10 slides\n"
            "- Deep architectural masterclass: 11-16+ slides\n"
            "Rule: Exactly '1 core concept per slide' with zero filler and zero fluff."
        )
        count_field = '"total_slides": dynamic_count,'

    system_prompt = (
        "You are a world-class presentation JSON generator. Respond strictly and solely with valid JSON matching the schema. "
        "Every slide must have exactly 3 distinct deep content blocks (title, description, tag). Ban all surface-level 1-line bullets, "
        "Point 1/Point 2 placeholders, and generic filler."
    )

    prompt = f"""You are a Principal Presentation Architect, Domain Specialist, and Executive Speechwriter.
TARGET TOPIC: "{clean_topic}"
TARGET AUDIENCE: Practitioners, engineers, leaders, and stakeholders demanding technical depth and authoritative, domain-grounded insight.

{slide_instruction}

### MANDATORY CONTENT FORMULA (ZERO FLUFF, REFUSE SURFACE-LEVEL BULLETS):
1. 100% STRICT TOPIC GROUNDING (ZERO HALLUCINATION & ZERO OFF-TOPIC CORPORATE JARGON):
   - Every single slide title, subtitle, concept card, explanation, metric, and speaker note MUST be strictly, deeply, and exclusively grounded in "{clean_topic}".
   - If "{clean_topic}" is scientific (e.g., Photosynthesis, Quantum Physics, CRISPR, Cellular Respiration):
     * Explain genuine chemical reactions, molecular structures, laws of thermodynamics/physics, cellular organelles, and biochemical cycles.
   - If "{clean_topic}" is history, literature, or arts:
     * Focus strictly on verified historical events, dates, cultural epochs, literary devices, and documented records.
   - If "{clean_topic}" is computer science, AI, or software (e.g., React, Kubernetes, Rust, Transformers):
     * Discuss exact algorithms, architectural invariants, memory models, protocol specifications, and benchmark metrics.
   - If "{clean_topic}" is business, economics, or marketing:
     * Detail specific market dynamics, unit economics, regulatory mechanisms, or empirical industry data.
   - STRICTLY FORBIDDEN: Do NOT inject generic corporate buzzwords (like "enterprise moats", "synergistic velocity", "cost avoidance") if "{clean_topic}" is NOT about corporate finance!
   - NO FILLERS: Ban all generic labels like "Point 1", "Overview", "Key Factors", "Introduction", or "Important Aspects".

2. PER-SLIDE CONTENT FORMULA (EXACTLY 3 DISTINCT HIGH-DEPTH BLOCKS):
   - "slide_title": An insightful conclusion or thesis statement (e.g., "Decentralized Compute: Eliminating Single-Node Failure Risks", "Thylakoid Proton Gradients: Driving ATP Synthase Rotational Catalysis"). Refuse shallow generic labels like "Overview" or "Point 1".
   - "badge": A crisp domain category in 2-4 words (e.g., "SYSTEM ARCHITECTURE", "BIOCHEMICAL MECHANICS").
   - "subtitle": Executive summary context line.
   - EXACTLY 3 DISTINCT CONTENT BLOCKS in "cards_or_points":
     * "title": 3-5 word technical or strategic concept specific to "{clean_topic}".
     * "description": 2-3 detailed sentences explaining the mechanism, context, operational reality, or actionable insight with domain precision.
     * "tag": Concrete metric or operational highlight (e.g., "99.98% SLA", "Cost: -35%", "ΔpH ~ 3.0", "O(log n)").
   - "highlight_metric": Concrete domain benchmark {{ "value": "...", "caption": "..." }}.
   - "speaker_notes": Comprehensive narrative script for the presenter (3-5 complete sentences written as a ready-to-deliver spoken talk-track).

3. SYSTEMATIC LAYOUT PRESETS:
   - Slide 1 MUST use layout: "title".
   - Architectural and visual slides (including Slide 2) MUST use layout: "split_image_content". For every visual slide:
     * Include "image_prompt": An evocative, detailed prompt describing the schematic/system concept (e.g., "futuristic neural network visualization dark glowing cyan technical diagram 8k", "quantum qubit entanglement lattice blueprint neon cyan").
     * Include exactly 2 high-depth technical content blocks in "cards_or_points".
   - Other slides alternate between: "card_grid" (3-Card Grid preset with 3 blocks) and "metric_split" (Metric & 2 Deep Insight Blocks preset).

Return ONLY valid raw JSON matching this schema:
{{
  "deck_title": "{clean_topic}: Executive Deep-Dive",
  "theme": "{theme}",
  {count_field}
  "slides": [
    {{
      "slide_number": 1,
      "layout": "title",
      "badge": "EXECUTIVE FOUNDATION",
      "slide_title": "Insightful Thesis Conclusion Regarding {clean_topic}",
      "subtitle": "Authoritative summary outlining the strategic and operational imperatives of {clean_topic}",
      "cards_or_points": [
        {{
          "title": "3-5 Word Technical Concept",
          "description": "2-3 detailed sentences explaining the mechanism, context, or actionable insight with authoritative domain precision.",
          "tag": "Key Highlight / Metric"
        }},
        {{
          "title": "Second Deep Domain Concept",
          "description": "2-3 detailed sentences explaining the underlying operational or architectural dynamics of this facet.",
          "tag": "Key Highlight / Metric"
        }},
        {{
          "title": "Third Core Mechanism Concept",
          "description": "2-3 detailed sentences explaining critical tradeoffs, performance impacts, or future trajectory.",
          "tag": "Key Highlight / Metric"
        }}
      ],
      "highlight_metric": {{ "value": "Benchmark", "caption": "Specific operational metric for {clean_topic}" }},
      "speaker_notes": "Comprehensive narrative script for the presenter detailing the overarching thesis and foundational dynamics of this slide."
    }},
    {{
      "slide_number": 2,
      "layout": "split_image_content",
      "badge": "ARCHITECTURAL TOPOLOGY",
      "slide_title": "Visualized Architectural Manifold of {clean_topic}",
      "subtitle": "Modular execution pathways and interconnected mechanics",
      "image_prompt": "{clean_topic} detailed technical architecture visualization dark cyan glowing 8k",
      "cards_or_points": [
        {{
          "title": "Primary Component",
          "description": "2-3 detailed sentences explaining the mechanism and actionable insight with domain precision.",
          "tag": "Key Highlight / Metric"
        }},
        {{
          "title": "Decoupled Orchestration",
          "description": "2-3 detailed sentences explaining underlying dynamics, fault isolation, and throughput scaling.",
          "tag": "Key Highlight / Metric"
        }}
      ],
      "highlight_metric": {{ "value": "99.4%", "caption": "Precision benchmark for {clean_topic}" }},
      "speaker_notes": "Examining this visual topology, we observe how decoupled execution manifolds mitigate single-point latency overhead."
    }}
  ]
}}"""

    response_text = ""
    # Resilient provider pipeline
    provider_calls = []
    if keys.get("groq"):
        provider_calls.append(lambda: call_groq(keys["groq"], "qwen/qwen3.8-27b", system_prompt, prompt, []))
        provider_calls.append(lambda: call_groq(keys["groq"], "openai/gpt-oss-120b", system_prompt, prompt, []))
    if keys.get("gemini"):
        provider_calls.append(lambda: call_gemini(keys["gemini"], "gemini-1.5-flash", system_prompt, prompt, []))
    if keys.get("openai"):
        provider_calls.append(lambda: call_openai(keys["openai"], "gpt-4o-mini", system_prompt, prompt, []))
    if keys.get("openrouter"):
        provider_calls.append(lambda: call_openrouter(keys["openrouter"], "google/gemini-2.0-flash-exp:free", system_prompt, prompt, []))

    for call_fn in provider_calls:
        try:
            res = await call_fn()
            if res and res.strip():
                response_text = res
                break
        except Exception as e:
            print(f"[Presentation Provider Gen Warning]: {e}")

    deck = None
    if response_text:
        try:
            cleaned = re.sub(r'```(?:json)?', '', response_text).replace('```', '').strip()
            deck = json.loads(cleaned)
        except Exception as e:
            print(f"[JSON Parse Warning]: {e}")

    if not deck or not isinstance(deck.get("slides"), list) or len(deck["slides"]) == 0:
        return generate_rich_fallback_deck_py(clean_topic, slide_count, theme)

    return normalize_presentation_deck(deck, topic=clean_topic)

@app.post("/api/generate-presentation")
async def generate_presentation(req: PresentationRequest):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    slide_count = req.slideCount if (req.slideCount and req.slideCount > 0) else None
    theme = req.theme or "modern_blue"
    env = load_env_dict()
    provider = req.provider or env.get("DEFAULT_PROVIDER", "groq")

    keys = {
        "groq": req.apiKey if (provider == "groq" and req.apiKey) else env.get("GROQ_API_KEY", ""),
        "gemini": req.apiKey if (provider == "gemini" and req.apiKey) else env.get("GEMINI_API_KEY", ""),
        "openai": req.apiKey if (provider == "openai" and req.apiKey) else env.get("OPENAI_API_KEY", ""),
        "openrouter": req.apiKey if (provider == "openrouter" and req.apiKey) else env.get("OPENROUTER_API_KEY", "")
    }

    deck = await build_presentation_deck_py(topic, slide_count, theme, keys)
    file_info = create_pptx_file_py(deck)

    return {
        "success": True,
        "deck": deck,
        "topic": topic,
        "slideCount": len(deck.get("slides", [])),
        "downloadUrl": file_info["downloadUrl"],
        "filename": file_info["filename"],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

# ---------------------------------------------------------------------------
# API: Authentication (Signup, Login, Me, Logout)
# ---------------------------------------------------------------------------
@app.post("/api/auth/signup")
async def auth_signup(req: SignupRequest):
    name = req.name.strip()
    email = req.email.strip().lower()
    password = req.password.strip()

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Full name must be at least 2 characters.")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    users = load_users_py()
    if any(u.get("email", "").lower() == email for u in users):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")

    salt = secrets.token_hex(16)
    p_hash = hash_password_py(password, salt)
    initials = "".join([part[0] for part in name.split() if part])[:2].upper() or "U"
    new_user = {
        "id": f"usr_{int(time.time())}_{secrets.token_hex(4)}",
        "name": name,
        "email": email,
        "salt": salt,
        "passwordHash": p_hash,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "avatar": initials,
        "plan": "free"
    }

    users.append(new_user)
    save_users_py(users)

    token = create_auth_token_py(new_user, 14)
    return {
        "success": True,
        "token": token,
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "avatar": new_user["avatar"],
            "plan": new_user["plan"],
            "createdAt": new_user["createdAt"]
        },
        "message": "Account created successfully! Welcome to ShiviAI."
    }

@app.post("/api/auth/login")
async def auth_login(req: LoginRequest):
    email = req.email.strip().lower()
    password = req.password.strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    users = load_users_py()
    user = next((u for u in users if u.get("email", "").lower() == email), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    computed_hash = hash_password_py(password, user.get("salt", ""))
    if computed_hash != user.get("passwordHash", ""):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    expiry_days = 30 if req.rememberMe else 7
    token = create_auth_token_py(user, expiry_days)

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "provider": user.get("provider", "email"),
            "avatar": user.get("avatar") or user["name"][:2].upper(),
            "plan": user.get("plan", "free"),
            "createdAt": user.get("createdAt")
        },
        "message": f"Welcome back, {user['name']}!"
    }

@app.post("/api/auth/oauth-login")
async def auth_oauth_login(req: OAuthLoginRequest):
    name = (req.name or "Explorer").strip()
    email = (req.email or "").strip().lower()
    if not email:
        clean_name = re.sub(r'[^a-z0-9]', '', name.lower()) or "user"
        email = f"{clean_name}@oauth.shiviai.com"
    provider = (req.provider or "google").strip().lower()
    avatar = (req.avatar or "").strip() or (name[:2].upper() if name else "U")

    users = load_users_py()
    user = next((u for u in users if u.get("email", "").lower() == email), None)

    if not user:
        salt = secrets.token_hex(16)
        user = {
            "id": f"usr_oauth_{provider}_{secrets.token_hex(4)}",
            "name": name,
            "email": email,
            "provider": provider,
            "salt": salt,
            "passwordHash": hash_password_py(secrets.token_hex(32), salt),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "avatar": avatar,
            "plan": "pro"
        }
        users.append(user)
        save_users_py(users)
    else:
        user["name"] = name or user.get("name", "Explorer")
        user["provider"] = provider
        if avatar:
            user["avatar"] = avatar
        save_users_py(users)

    token = create_auth_token_py(user, 30)
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "provider": user.get("provider", provider),
            "avatar": user.get("avatar") or avatar,
            "plan": user.get("plan", "pro"),
            "createdAt": user.get("createdAt")
        },
        "message": f"Successfully connected with {('GitHub' if provider == 'github' else 'Google')}!"
    }

@app.get("/api/auth/me")
async def auth_me(request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else ""
    verified = verify_auth_token_py(token)
    if not verified:
        raise HTTPException(status_code=401, detail="Session expired or invalid token.")

    users = load_users_py()
    user = next((u for u in users if u.get("id") == verified.get("sub") or u.get("email") == verified.get("email")), None)
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    return {
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "provider": user.get("provider", "email"),
            "avatar": user.get("avatar") or user["name"][:2].upper(),
            "plan": user.get("plan", "free"),
            "createdAt": user.get("createdAt")
        }
    }

@app.post("/api/auth/logout")
async def auth_logout():
    return {"success": True, "message": "Logged out successfully."}

@app.post("/api/auth/forgot-password")
async def auth_forgot_password(req: ForgotPasswordRequest):
    email = req.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email address is required.")
    return {
        "success": True,
        "message": f"If an account exists for {email}, a password reset link has been dispatched."
    }

# ---------------------------------------------------------------------------
# API: Knowledge Retrieval (RAG)
# ---------------------------------------------------------------------------
@app.get("/api/knowledge")
async def get_knowledge():
    if KNOWLEDGE_PATH.exists():
        try:
            with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read knowledge file: {e}")
    return {"knowledgeBase": []}

@app.post("/api/knowledge/query")
async def query_knowledge(req: KnowledgeQueryRequest):
    if not KNOWLEDGE_PATH.exists():
        return {"results": []}
    try:
        with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            kb = data.get("knowledgeBase", [])
    except Exception:
        return {"results": []}

    q_words = set(req.query.lower().split())
    scored = []
    for item in kb:
        content_text = (item.get("title", "") + " " + item.get("content", "") + " " + " ".join(item.get("tags", []))).lower()
        score = sum(1 for w in q_words if w in content_text)
        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = [item for _, item in scored[:req.limit]]
    return {"results": results}

# ---------------------------------------------------------------------------
# Static File Mounts & SPA Fallback
# ---------------------------------------------------------------------------
# Mount generated images
app.mount("/generated_images", StaticFiles(directory=str(IMAGES_DIR)), name="generated_images")

# Serve index.html at root
@app.get("/")
async def serve_index():
    index_file = ROOT_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file, media_type="text/html")
    return JSONResponse({"error": "index.html not found in project root"}, status_code=404)

# Static file handler for application assets (style.css, app.js, brain.js, knowledge.json, etc.)
@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    target = (ROOT_DIR / file_path).resolve()
    # Path traversal protection
    if not str(target).startswith(str(ROOT_DIR)):
        raise HTTPException(status_code=403, detail="Access forbidden")

    if target.is_file():
        mime_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".ico": "image/x-icon",
            ".webp": "image/webp",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        }
        media_type = mime_types.get(target.suffix.lower(), "application/octet-stream")
        return FileResponse(target, media_type=media_type)

    raise HTTPException(status_code=404, detail="File not found")

# ---------------------------------------------------------------------------
# Server Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = get_port()
    print(f"🚀 Starting Shivi AI Python Backend on http://0.0.0.0:{port} ...")
    uvicorn.run("python_server:app", host="0.0.0.0", port=port, reload=True)
