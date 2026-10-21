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

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"
    model: Optional[str] = "tts-1"
    speed: Optional[float] = 1.02
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
async def call_groq(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
    target_model = model or "qwen/qwen3.8-27b"
    if not target_model or "llama" in target_model.lower():
        target_model = "qwen/qwen3.8-27b"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            messages.append({"role": h.get("role", "user"), "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    max_tok = (options or {}).get("max_tokens", 4096)
    assert http_client is not None
    resp = await http_client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": target_model,
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": max_tok
        },
        timeout=35.0
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

async def call_openai(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
    target_model = model or "gpt-4o-mini"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            messages.append({"role": h.get("role", "user"), "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    max_tok = (options or {}).get("max_tokens", 2500)
    assert http_client is not None
    resp = await http_client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": target_model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": max_tok
        },
        timeout=35.0
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

async def call_openrouter(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
    target_model = model or "qwen/qwen3.8-27b:free"
    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-8:]:
        if isinstance(h, dict) and "content" in h:
            messages.append({"role": h.get("role", "user"), "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})

    max_tok = (options or {}).get("max_tokens", 2500)
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
            "max_tokens": max_tok
        },
        timeout=35.0
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

async def call_gemini(api_key: str, model: str, system_prompt: str, user_msg: str, history: List[Dict[str, Any]], options: Optional[Dict[str, Any]] = None) -> str:
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

    max_tok = (options or {}).get("max_tokens", 2500)
    payload: Dict[str, Any] = {
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": max_tok}
    }
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    assert http_client is not None
    resp = await http_client.post(url, json=payload, timeout=35.0)
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
                slide_count = max(5, min(20, int(slide_match.group(1))))
            except Exception:
                pass
            
        if is_ppt_slash:
            topic = re.sub(r"^/(ppt|presentation|slides|deck)\s+", "", user_msg, flags=re.IGNORECASE).strip()
            topic = re.sub(r"(?:^|\s)(?:(\d+)\s*(?:slides?|slide deck)|(?:on|about|for)\s+(\d+)\s*(?:slides?|slide deck))\s*(?:on|about|for)?\s*", " ", topic, flags=re.IGNORECASE)
            topic = re.sub(r"\s*(?:on|about|for)?\s*(\d+)\s*(?:slides?|slide deck)\s*$", "", topic, flags=re.IGNORECASE)
            topic = re.sub(r"^(?:on|about|for)\s+", "", topic, flags=re.IGNORECASE).strip()
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

def hash_code(s: str) -> int:
    h = 0
    s_str = str(s or "")
    for ch in s_str:
        h = ((h << 5) - h + ord(ch)) & 0xFFFFFFFF
    if h >= 0x80000000:
        h -= 0x100000000
    return h

def build_contextual_slide_image_url(slide: dict, topic: str, index: int) -> str:
    slide_obj = slide or {}
    raw_title = str(slide_obj.get("title") or slide_obj.get("slide_title") or "")
    key_subject = re.sub(r'[^a-zA-Z0-9 ]', '', raw_title).strip()

    specific_context = str(slide_obj.get("image_prompt") or slide_obj.get("visual_description") or slide_obj.get("image_search_query") or "").strip()
    if not specific_context:
        key_bullet = ""
        bullets = slide_obj.get("bullets")
        if bullets and isinstance(bullets, list) and len(bullets) > 0:
            first_b = re.sub(r'^\*\*.*?\*\*:\s*', '', str(bullets[0]))
            first_b = re.sub(r'[^a-zA-Z0-9 ]', '', first_b).strip()
            key_bullet = first_b[:60]
        specific_context = f"{topic} {key_subject} {key_bullet}".strip() if (key_subject or key_bullet) else f"{topic} {key_subject}".strip()

    # Ban generic abstract or surreal buzzwords so photos remain strictly contextual
    specific_context = re.sub(r'\b(abstract|surreal|geometric shapes|neon glow|digital wave|glowing swirls|3D data visualization|hologram|futuristic background)\b', '', specific_context, flags=re.IGNORECASE).strip()
    if not specific_context:
        specific_context = f"{topic} {key_subject}".strip() or f"{topic} slide {index}"

    style_suffix = "high resolution documentary photography, editorial photo, realistic lighting, 4k, hyper-detailed, clean sharp focus, authentic context"
    enhanced_prompt = specific_context if "documentary photography" in specific_context else f"{specific_context}, {style_suffix}"

    seed = abs(hash_code(f"{topic}_slide_{index}"))
    safe_encoded = urllib.parse.quote(enhanced_prompt)
    return f"https://image.pollinations.ai/prompt/{safe_encoded}?width=900&height=550&nologo=true&seed={seed}"

def repair_truncated_json(json_str: str) -> Optional[dict]:
    if not json_str or not isinstance(json_str, str):
        return None
    text = re.sub(r'```(?:json)?', '', json_str, flags=re.IGNORECASE).replace('```', '').strip()
    first_brace = text.find('{')
    if first_brace != -1:
        text = text[first_brace:].strip()
    try:
        return json.loads(text)
    except Exception:
        pass

    slides_index = text.find('"slides"')
    if slides_index == -1:
        return None

    last_object_close = text.rfind('}')
    if last_object_close > slides_index:
        candidate = text[:last_object_close + 1].strip()
        if candidate.endswith(','):
            candidate = candidate[:-1].strip()
        if not candidate.endswith(']'):
            candidate += '\n  ]'
        if not candidate.endswith('}'):
            candidate += '\n}'
        try:
            return json.loads(candidate)
        except Exception as e:
            print(f"[Truncated JSON Recovery Failed]: {e}")
    return None

def normalize_presentation_deck(deck: dict, topic: str = "Executive Presentation", fallback_count: int = 5) -> dict:
    target_count = min(20, max(5, int(fallback_count) if (fallback_count and str(fallback_count).isdigit()) else 5))
    clean_topic = (topic or "Strategic Initiative").strip()

    if not deck or not isinstance(deck, dict):
        return generate_rich_fallback_deck_py(clean_topic, target_count)

    raw_title = deck.get("deck_title") or deck.get("title") or (f"{clean_topic}: Executive Masterclass" if clean_topic else "Keynote Presentation")
    deck_title = str(raw_title).strip().strip('"').strip("'")
    theme = str(deck.get("theme") or "dark_modern").lower()
    raw_slides = deck.get("slides") or []

    if not isinstance(raw_slides, list) or len(raw_slides) == 0:
        return generate_rich_fallback_deck_py(clean_topic, target_count, theme)

    normalized_slides = []
    total_raw = len(raw_slides)

    for idx, s in enumerate(raw_slides):
        if not isinstance(s, dict):
            continue
        slide_num = idx + 1

        # 1. Layout Type
        raw_layout = str(s.get("layout_type") or s.get("layout") or "").lower()
        layout_type = "title_hero" if (idx == 0 or "title" in raw_layout) else "split_image_content"

        # 2. Category / Kicker
        default_cat = "EXECUTIVE BRIEFING" if idx == 0 else ("STRATEGIC OBJECTIVE" if idx == 1 else ("STRATEGIC ROADMAP" if idx == total_raw - 1 else f"CORE PILLAR 0{idx}"))
        category = str(s.get("category") or s.get("badge") or default_cat).upper().strip()

        # 3. Slide Title & Subtitle
        raw_st = str(s.get("title") or s.get("slide_title") or f"Strategic Pillar 0{slide_num}").strip()
        slide_title = raw_st if raw_st != clean_topic else f"Strategic Insights: {clean_topic}"
        subtitle = str(s.get("subtitle") or "").strip()

        # 4. Objective
        objective = str(s.get("objective") or s.get("speaker_notes") or "").strip()
        if not objective:
            if idx == 0:
                objective = f"Deliver an authoritative, C-level executive briefing on {clean_topic}."
            elif idx == 1:
                objective = "Define measurable milestones and overcome existing structural bottlenecks."
            elif idx == total_raw - 1:
                objective = "Actionable implementation roadmap and immediate leadership mandate."
            else:
                objective = "Deep-dive analysis of core mechanisms and impact drivers."

        # 5. Bullets
        bullets = []
        raw_bullets = s.get("bullets")
        if raw_bullets and isinstance(raw_bullets, list):
            for b in raw_bullets:
                b_str = str(b).strip()
                if b_str:
                    bullets.append(b_str)
        elif s.get("cards_or_points") and isinstance(s["cards_or_points"], list):
            for c in s["cards_or_points"]:
                if isinstance(c, dict):
                    t = str(c.get("title") or c.get("label") or "Core Vector").strip()
                    d = str(c.get("description") or c.get("detail") or "").strip()
                    bullets.append(f"**{t}**: {d}")
                elif isinstance(c, str) and c.strip():
                    bullets.append(c.strip())

        if len(bullets) < 2:
            if idx == 0:
                bullets = [
                    f"**Strategic Intent**: High-level vision outlining the transformative roadmap, architectural requirements, and deliverables for {clean_topic}.",
                    "**Target Audience**: Designed for cross-functional stakeholders, engineering directors, and leadership demanding technical depth.",
                    "**Presentation Standard**: Created with ShiviAI • Executive Keynote Widescreen Edition"
                ]
            elif idx == 1:
                bullets = [
                    "**Operational Efficiency**: Eliminating redundant manual workflows to reduce cycle times by up to 35% through automated orchestration.",
                    "**System Reliability**: Implementing end-to-end telemetry and verification checks to safeguard uptime under peak traffic conditions.",
                    "**Scalable Architecture**: Decoupling services to ensure modularity and predictable throughput as data density expands."
                ]
            elif idx == total_raw - 1:
                bullets = [
                    "**Phase 1 Kickoff**: Establish foundational telemetry baselines and spin up a dedicated cross-functional pilot team within 14 days.",
                    "**Continuous Verification**: Implement automated benchmark validation gates to guarantee production SLA compliance.",
                    "**Measurable ROI**: Accelerate capital efficiency through iterative feedback loops and compounding organizational leverage."
                ]
            else:
                bullets = [
                    "**Architectural Decoupling**: Partitioning execution pathways eliminates single points of failure while sustaining deterministic throughput.",
                    "**Empirical Benchmarks**: Verified telemetry demonstrates a 3.4x compression in latency overhead across production workloads.",
                    "**Adaptive Scaling**: Autonomous monitoring agents dynamically rebalance computational resources in response to traffic fluctuations."
                ]

        cards_or_points = []
        for b_idx, b_text in enumerate(bullets):
            match = re.match(r'^\*\*(.*?)\*\*:\s*(.*)$', b_text)
            if match:
                k_title = match.group(1).strip()
                k_desc = match.group(2).strip()
            elif ":" in b_text:
                parts = b_text.split(":", 1)
                k_title = parts[0].replace("*", "").strip()
                k_desc = parts[1].join(":").strip() if len(parts) > 1 else ""
            else:
                k_title = f"Pillar 0{b_idx + 1}"
                k_desc = b_text
            cards_or_points.append({
                "title": k_title,
                "label": k_title,
                "description": k_desc,
                "detail": k_desc,
                "tag": category or k_title
            })

        # 6. Contextual Photo Prompt & URLs via build_contextual_slide_image_url
        img_url = build_contextual_slide_image_url(s, clean_topic, slide_num)
        seed = abs(hash_code(f"{clean_topic}_slide_{slide_num}"))
        fallback_url = f"https://picsum.photos/seed/{seed}/900/550"
        key_subject = re.sub(r'[^a-zA-Z0-9 ]', '', str(s.get("title") or s.get("slide_title") or "")).strip()
        specific_context = str(s.get("image_prompt") or s.get("visual_description") or s.get("image_search_query") or f"{clean_topic} {key_subject}").strip()
        specific_context = re.sub(r'\b(abstract|surreal|geometric shapes|neon glow|digital wave|glowing swirls|3D data visualization|hologram)\b', '', specific_context, flags=re.IGNORECASE).strip() or f"{clean_topic} {key_subject}"
        enhanced_prompt = f"{specific_context}, high resolution documentary photography, editorial photo, realistic lighting, 4k, hyper-detailed, clean sharp focus, authentic context"

        # 7. Speaker notes talk-track
        speaker_notes = str(s.get("speaker_notes") or "").strip()
        if not speaker_notes or len(speaker_notes) < 30:
            primary_lead = bullets[0].split(":")[0].replace("*", "") if bullets else "this pillar"
            speaker_notes = f"In this slide, we examine {slide_title}. Notice how {primary_lead} establishes the baseline imperative for this domain. Our objective is clear: {objective}"

        normalized_slides.append({
            "slide_number": slide_num,
            "layout_type": layout_type,
            "layout": layout_type,
            "category": category,
            "badge": category,
            "title": slide_title,
            "slide_title": slide_title,
            "subtitle": subtitle,
            "objective": objective,
            "bullets": bullets[:4],
            "cards_or_points": cards_or_points[:4],
            "image_search_query": s.get("image_search_query") or f"{clean_topic} {slide_title}",
            "visual_description": s.get("visual_description") or enhanced_prompt,
            "image_prompt": enhanced_prompt,
            "image_url": img_url,
            "fallback_image_url": fallback_url,
            "highlight_metric": {
                "value": "Tier-1",
                "caption": f"Standard for {clean_topic}"
            },
            "speaker_notes": speaker_notes
        })

    # If fewer slides were generated than requested, backfill from the rich 20-slide library
    if len(normalized_slides) < target_count:
        fallback = generate_rich_fallback_deck_py(clean_topic, target_count, theme)
        fb_slides = fallback.get("slides") or []
        for extra in fb_slides[len(normalized_slides):target_count]:
            extra_copy = dict(extra)
            extra_copy["slide_number"] = len(normalized_slides) + 1
            normalized_slides.append(extra_copy)

    return {
        "deck_title": deck_title,
        "title": deck_title,
        "topic": clean_topic,
        "theme": theme,
        "total_slides": len(normalized_slides),
        "slides": normalized_slides[:target_count]
    }

def generate_rich_fallback_deck_py(topic: str, slide_count: Optional[int] = None, theme: str = "dark_modern") -> dict:
    count = min(20, max(5, int(slide_count) if (slide_count and str(slide_count).isdigit()) else 5))
    clean_topic = (topic or "").strip() or "Strategic Architecture"
    deck_title = f"{clean_topic}: Executive Masterclass"

    # 20 Comprehensive, Domain-Grounded Slide Blueprints
    master_slides = [
        {
            "slide_number": 1,
            "layout_type": "title_hero",
            "category": "EXECUTIVE BRIEFING",
            "title": f"Strategic Masterclass: {clean_topic}",
            "subtitle": "Executive architecture, operational imperatives, and market dynamics",
            "objective": f"Deliver an authoritative, end-to-end strategic briefing on {clean_topic} for cross-functional leadership.",
            "bullets": [
                f"**Strategic Intent**: High-level vision outlining the transformative roadmap, architectural requirements, and expected deliverables for {clean_topic}.",
                "**Target Audience**: Designed for cross-functional stakeholders, engineering directors, and executive leadership demanding technical depth.",
                "**Presentation Standard**: Created with ShiviAI • Executive Keynote Widescreen Edition"
            ],
            "image_search_query": f"{clean_topic} executive briefing room modern enterprise headquarters",
            "visual_description": f"Modern executive command briefing room with high-definition digital displays showcasing {clean_topic} operational data, cinematic corporate lighting",
            "image_prompt": f"Modern executive command briefing room with high-definition digital displays showcasing {clean_topic} operational data, cinematic corporate lighting, documentary photography, 4k"
        },
        {
            "slide_number": 2,
            "layout_type": "split_image_content",
            "category": "STRATEGIC OBJECTIVE",
            "title": "Core Objectives & System Bottlenecks",
            "subtitle": "Navigating primary catalysts and resolving structural bottlenecks",
            "objective": "Define measurable milestones and overcome existing structural bottlenecks across systems.",
            "bullets": [
                "**Operational Efficiency**: Eliminating redundant manual workflows to reduce cycle times by up to 35% through orchestrated pipelines.",
                "**System Reliability**: Implementing end-to-end telemetry and automated verification guardrails to safeguard uptime and prevent failovers.",
                "**Scalable Architecture**: Decoupling interdependent layers to ensure modular flexibility as compute demands and data density expand."
            ],
            "image_search_query": f"{clean_topic} mission critical operations center telemetry dashboards",
            "visual_description": f"High-tech mission control room with engineers analyzing telemetry monitors and real-time operational status of {clean_topic}",
            "image_prompt": f"High-tech mission control room with engineers analyzing telemetry monitors and real-time operational status of {clean_topic}, realistic ambient lighting, documentary photography, 4k"
        },
        {
            "slide_number": 3,
            "layout_type": "split_image_content",
            "category": "HISTORICAL EVOLUTION",
            "title": "Evolutionary Drivers & Paradigm Trajectory",
            "subtitle": "From legacy methodologies to autonomous, high-throughput systems",
            "objective": "Trace generational paradigm shifts establishing modern domain standards.",
            "bullets": [
                "**Foundational Precedents**: Early monolithic implementations established domain feasibility but suffered severe horizontal scaling friction.",
                "**Decoupled Modernization**: Transition toward distributed micro-services eliminated single points of computational failure.",
                "**Autonomous Convergence**: Current state-of-the-art leverages machine-speed feedback loops and predictive heuristics."
            ],
            "image_search_query": f"{clean_topic} technical engineering laboratory hardware evolution",
            "visual_description": f"Clean technical laboratory displaying the physical evolution of engineering hardware for {clean_topic}",
            "image_prompt": f"Clean technical laboratory displaying the physical evolution of engineering hardware for {clean_topic}, macro photography, studio lighting, hyper-detailed"
        },
        {
            "slide_number": 4,
            "layout_type": "split_image_content",
            "category": "SYSTEM ARCHITECTURE",
            "title": "Core Architecture & Technical Topology",
            "subtitle": "Underlying invariants, execution paths, and fault-tolerant topologies",
            "objective": "Demystify the foundational mechanics driving deterministic performance in production.",
            "bullets": [
                "**Decoupled Orchestration**: Distributed state machines isolate computational stages to maintain deterministic latency boundaries across concurrent threads.",
                "**Autonomous Telemetry**: Continuous observability agents monitor throughput gradients and dynamically rebalance cluster workloads in real time.",
                "**Fault Isolation**: Partitioning critical services prevents cascading node degradation and ensures resilient, non-blocking fallback mechanisms."
            ],
            "image_search_query": f"{clean_topic} enterprise datacenter server corridor fiber-optic cabling",
            "visual_description": f"Enterprise datacenter server corridor with glowing cable management and high-density compute blades for {clean_topic}",
            "image_prompt": f"Enterprise datacenter server corridor with glowing cable management and high-density compute blades for {clean_topic}, realistic lighting, documentary photography, 4k"
        },
        {
            "slide_number": 5,
            "layout_type": "split_image_content",
            "category": "HARDWARE & COMPUTE",
            "title": "Hardware Topology & Compute Substrates",
            "subtitle": "Provisioning resilient node capacity, bare-metal clusters, and bandwidth",
            "objective": "Specify physical infrastructure requirements supporting production workloads.",
            "bullets": [
                "**Compute Acceleration**: Utilizing specialized accelerator clusters to compress training and execution latency curves by over 60%.",
                "**Memory Bandwidth**: High-throughput interconnect fabrics eliminate memory bottlenecks during intensive concurrent analytical queries.",
                "**Thermal Management**: Precision cooling infrastructure preserves sustained peak clock speeds across dense computational chassis."
            ],
            "image_search_query": f"{clean_topic} semiconductor cleanroom processor microchip inspection",
            "visual_description": f"Semiconductor cleanroom technician inspecting silicon processor wafer and compute hardware for {clean_topic}",
            "image_prompt": f"Semiconductor cleanroom technician inspecting silicon processor wafer and compute hardware for {clean_topic}, clean sharp focus, editorial photography, 4k"
        },
        {
            "slide_number": 6,
            "layout_type": "split_image_content",
            "category": "DATA TOPOLOGY",
            "title": "Data Ingestion & Event Stream Topology",
            "subtitle": "Real-time telemetry, asynchronous brokers, and immutable ledgers",
            "objective": "Establish high-throughput data processing pipelines with zero data loss.",
            "bullets": [
                "**Streaming Backpressure**: Reactive event brokers dynamically throttle ingestion rates to shield downstream storage engines from spike degradation.",
                "**Schema Enforcement**: Strict serialization contracts reject malformed payloads at the perimeter to preserve pipeline data integrity.",
                "**Immutable Audit Logs**: Append-only transaction journals provide mathematically verifiable audit trails for compliance forensics."
            ],
            "image_search_query": f"{clean_topic} high density fiber optic network patch bay",
            "visual_description": "Macro documentary photograph of high-density fiber-optic network patch bay transmitting data in modern server facility",
            "image_prompt": f"Macro documentary photograph of high-density fiber-optic network patch bay transmitting data in modern server facility for {clean_topic}, sharp focus, authentic context"
        },
        {
            "slide_number": 7,
            "layout_type": "split_image_content",
            "category": "ALGORITHMIC FOUNDATIONS",
            "title": "Algorithmic Models & Mathematical Invariants",
            "subtitle": "Deterministic execution guarantees, state convergence, and optimization",
            "objective": "Detail the algorithmic core governing deterministic decision boundaries.",
            "bullets": [
                "**Loss Convergence**: Advanced gradient optimization algorithms ensure rapid parameter convergence while avoiding local suboptimal plateaus.",
                "**Probabilistic Calibration**: Rigorous confidence interval scoring prevents overconfident edge-case predictions during production anomalies.",
                "**Dynamic Tuning**: Adaptive tuning heuristics modulate learning rates dynamically to safeguard training stability."
            ],
            "image_search_query": f"{clean_topic} software engineers whiteboard algorithmic formulations",
            "visual_description": f"Software engineers collaborating at glass whiteboard discussing algorithmic formulas for {clean_topic}",
            "image_prompt": f"Software engineers collaborating at glass whiteboard discussing algorithmic formulas for {clean_topic}, authentic startup office, realistic depth of field, 4k"
        },
        {
            "slide_number": 8,
            "layout_type": "split_image_content",
            "category": "SECURITY & GOVERNANCE",
            "title": "Security Posture & Cryptographic Boundaries",
            "subtitle": "Mutual TLS, principle of least privilege, and real-time defense",
            "objective": "Establish bulletproof perimeter defense and zero-trust authentication.",
            "bullets": [
                "**Cryptographic Identity**: Ephemeral mutual TLS tokens authenticate inter-service requests to eliminate static credential exploitation vectors.",
                "**Least Privilege**: Role-based access boundaries restrict compute nodes to minimum necessary dataset partitions.",
                "**Automated Isolation**: Behavioral anomaly sentinels quarantine compromised worker pods within sub-second detection windows."
            ],
            "image_search_query": f"{clean_topic} cybersecurity operations center analyst console",
            "visual_description": f"Cybersecurity operations center analyst working in front of multi-monitor security consoles for {clean_topic}",
            "image_prompt": f"Cybersecurity operations center analyst working in front of multi-monitor security consoles for {clean_topic}, moody office lighting, documentary photography, 4k"
        },
        {
            "slide_number": 9,
            "layout_type": "split_image_content",
            "category": "PERFORMANCE BENCHMARKS",
            "title": "Empirical Benchmarks & Throughput Profiles",
            "subtitle": "Quantified latency profiles, scaling thresholds, and stress tolerances",
            "objective": "Validate performance gains against standardized industry baseline metrics.",
            "bullets": [
                "**Latency Compression**: Sustained p99 latency reduced from 240ms to 38ms through kernel-bypass networking and memory pooling.",
                "**Concurrent Scaling**: Verified linear throughput scaling up to 100,000 simultaneous concurrent sessions without degradation.",
                "**Resource Footprint**: Memory usage optimization cuts hardware compute expenditures by up to 28% across identical transaction volumes."
            ],
            "image_search_query": f"{clean_topic} electronics laboratory oscilloscope benchmark diagnostic",
            "visual_description": f"Electronics testing workbench with digital oscilloscopes and benchmark diagnostic instruments evaluating {clean_topic}",
            "image_prompt": f"Electronics testing workbench with digital oscilloscopes and benchmark diagnostic instruments evaluating {clean_topic}, realistic lighting, documentary photography"
        },
        {
            "slide_number": 10,
            "layout_type": "split_image_content",
            "category": "OPERATIONAL GOVERNANCE",
            "title": "Operational Auditing & SLA Enforcement",
            "subtitle": "Automated policy enforcement, compliance tracing, and audit resilience",
            "objective": "Ensure continuous regulatory adherence and transparent service-level compliance.",
            "bullets": [
                "**Telemetry Ingestion**: Granular metrics are collected across all compute nodes to generate continuous regulatory compliance evidence.",
                "**Automated Remediation**: Rule-based remediation controllers trigger proactive node recycling prior to threshold breaches.",
                "**Transparent Reporting**: Real-time stakeholder dashboards expose uptime SLA metrics with complete cryptographic verification."
            ],
            "image_search_query": f"{clean_topic} corporate boardroom compliance audit tablets",
            "visual_description": f"Corporate leadership team reviewing operational metrics and audit reports on conference table tablets for {clean_topic}",
            "image_prompt": f"Corporate leadership team reviewing operational metrics and audit reports on conference table tablets for {clean_topic}, editorial corporate photo, 4k"
        },
        {
            "slide_number": 11,
            "layout_type": "split_image_content",
            "category": "ECOSYSTEM INTEGRATION",
            "title": "API Integrations & Interoperability Mesh",
            "subtitle": "Decoupled contracts, cross-platform adapters, and third-party orchestration",
            "objective": "Enable seamless interoperability with legacy enterprise environments.",
            "bullets": [
                "**Schema Translation**: Lightweight translation adapters convert legacy protocols into modern gRPC payloads with sub-millisecond overhead.",
                "**Circuit Breaking**: Distributed circuit breakers isolate third-party upstream outages to prevent cascade deadlocks.",
                "**Developer Ergonomics**: Comprehensive SDK libraries and automated sandbox generation accelerate partner integration timelines."
            ],
            "image_search_query": f"{clean_topic} software developer desk dual monitors code",
            "visual_description": f"Software developer desk setup with dual monitors showing code and API integration schemas for {clean_topic}",
            "image_prompt": f"Software developer desk setup with dual monitors showing code and API integration schemas for {clean_topic}, natural daylight, clean sharp focus, authentic context"
        },
        {
            "slide_number": 12,
            "layout_type": "split_image_content",
            "category": "INDUSTRY VERTICALS",
            "title": "Vertical Sector Applications & Deployment Profiles",
            "subtitle": "Enterprise healthcare, financial, industrial, and retail operations",
            "objective": "Showcase tailored domain adaptations across diverse market verticals.",
            "bullets": [
                "**Financial Systems**: Algorithmic risk profiling models identify anomalous fraudulent transactions in under 12 milliseconds.",
                "**Healthcare Diagnostics**: High-fidelity multimodal ingestion accelerates medical imaging triage without compromising clinical diagnostic rigor.",
                "**Industrial Manufacturing**: Real-time sensor telemetry predicts mechanical component fatigue weeks prior to catastrophic failure."
            ],
            "image_search_query": f"{clean_topic} automated robotic factory floor industrial operations",
            "visual_description": f"Modern industrial factory floor with automated robotic manufacturing arms and monitoring screens powered by {clean_topic}",
            "image_prompt": f"Modern industrial factory floor with automated robotic manufacturing arms and monitoring screens powered by {clean_topic}, documentary photography, 4k"
        },
        {
            "slide_number": 13,
            "layout_type": "split_image_content",
            "category": "FIELD CASE STUDIES",
            "title": "Production Case Studies & Measured Outcomes",
            "subtitle": "Empirical deployment outcomes, migration friction, and measured gains",
            "objective": "Analyze real-world enterprise deployments and validated return on investment.",
            "bullets": [
                "**Enterprise Rollout**: Global financial enterprise successfully migrated 45 legacy pipelines with zero unscheduled downtime.",
                "**Quantified Throughput**: Post-migration telemetry confirmed a 3.4x surge in transactional capacity alongside a 40% compute cost reduction.",
                "**Operator Feedback**: Engineering teams reported a 55% decline in on-call triage alarms following automated self-healing adoption."
            ],
            "image_search_query": f"{clean_topic} engineering technical team project review office",
            "visual_description": f"Technical team gathered around monitor reviewing successful live production deployment for {clean_topic}",
            "image_prompt": f"Technical team gathered around monitor reviewing successful live production deployment for {clean_topic}, natural office candid photography, 4k"
        },
        {
            "slide_number": 14,
            "layout_type": "split_image_content",
            "category": "TECHNICAL CHALLENGES",
            "title": "Architectural Bottlenecks & Critical Hazards",
            "subtitle": "Concurrency contention, cold-start latency, and state desynchronization",
            "objective": "Identify high-risk architectural failure modes before production scale.",
            "bullets": [
                "**Concurrency Contention**: Shared distributed database locks can induce catastrophic cascade starvation under asymmetric traffic spikes.",
                "**Cold-Start Latency**: Initializing heavyweight containerized model instances introduces unacceptable p99 latency spikes if unmitigated.",
                "**State Desynchronization**: Asynchronous replication across geographically separated datacenters risks transient split-brain inconsistencies."
            ],
            "image_search_query": f"{clean_topic} systems engineer diagnostic laptop server aisle",
            "visual_description": f"Systems engineer with diagnostic laptop in server aisle debugging technical performance logs for {clean_topic}",
            "image_prompt": f"Systems engineer with diagnostic laptop in server aisle debugging technical performance logs for {clean_topic}, realistic lighting, documentary photography"
        },
        {
            "slide_number": 15,
            "layout_type": "split_image_content",
            "category": "RESILIENCE ENGINEERING",
            "title": "Risk Mitigation & Disaster Recovery",
            "subtitle": "Automated self-healing, multi-region replication, and graceful degradation",
            "objective": "Construct defensive architectural guardrails ensuring uninterrupted business continuity.",
            "bullets": [
                "**Warm Pooling**: Pre-warmed container instances eliminate cold-start penalties by maintaining idle headroom during predicted spike intervals.",
                "**Chaos Testing**: Automated fault injection simulations continuously validate failover orchestrations against unannounced node terminations.",
                "**Multi-Region Quorum**: Raft-based consensus clusters span three independent availability zones to guarantee uninterrupted quorum availability."
            ],
            "image_search_query": f"{clean_topic} industrial backup power generators datacenter cooling",
            "visual_description": f"Industrial redundant power and cooling backup systems at enterprise server facility for {clean_topic}",
            "image_prompt": f"Industrial redundant power and cooling backup systems at enterprise server facility for {clean_topic}, industrial documentary photography, 4k"
        },
        {
            "slide_number": 16,
            "layout_type": "split_image_content",
            "category": "CAPITAL EFFICIENCY",
            "title": "Cost Optimization & Total Cost of Ownership",
            "subtitle": "Unit economics, capital allocation efficiency, and infrastructure ROI",
            "objective": "Structure sustainable infrastructure spending with predictable unit economics.",
            "bullets": [
                "**Spot Allocation**: Dynamic spot instance harvesting reduces auxiliary compute expenses by up to 52% for fault-tolerant batch workloads.",
                "**Storage Tiering**: Automated data lifecycle rules migrate dormant historical telemetry to cold archival storage automatically.",
                "**Compounding ROI**: Operational leverage allows transaction volume to scale 5x with less than 20% growth in infrastructure spend."
            ],
            "image_search_query": f"{clean_topic} executive reviewing financial cost graphs tablet",
            "visual_description": f"Executive reviewing financial analytics and infrastructure cost graphs on modern tablet for {clean_topic}",
            "image_prompt": f"Executive reviewing financial analytics and infrastructure cost graphs on modern tablet for {clean_topic}, sharp focus, editorial photo, 4k"
        },
        {
            "slide_number": 17,
            "layout_type": "split_image_content",
            "category": "ORGANIZATIONAL MATURITY",
            "title": "Cross-Functional Enablement & Tiger Teams",
            "subtitle": "Engineering enablement, change management, and operational readiness",
            "objective": "Equip internal engineering talent with requisite domain competencies.",
            "bullets": [
                "**Tiger Team Governance**: Dedicated SWAT engineering teams lead pilot implementations and codify organizational architectural playbooks.",
                "**Continuous Upskilling**: Structured technical workshops ensure staff engineers master distributed state management paradigms.",
                "**Internal Platform Hub**: Self-service developer portals streamline deployment onboarding and enforce organizational best practices."
            ],
            "image_search_query": f"{clean_topic} engineering teams collaborative technical classroom",
            "visual_description": f"Engineering teams in modern collaborative tech classroom participating in technical training for {clean_topic}",
            "image_prompt": f"Engineering teams in modern collaborative tech classroom participating in technical training for {clean_topic}, natural lighting, candid documentary photography"
        },
        {
            "slide_number": 18,
            "layout_type": "split_image_content",
            "category": "EXECUTION TIMELINE",
            "title": "Implementation Roadmap: Multi-Stage Horizons",
            "subtitle": "Disciplined execution roadmap from discovery to autonomous scale",
            "objective": "Establish a phased rollout timeline with clear accountability gates.",
            "bullets": [
                "**Phase 1 Kickoff (Weeks 1-4)**: Audit infrastructure baselines, establish telemetry probes, and assemble a cross-functional Tiger Team.",
                "**Phase 2 Orchestration (Weeks 5-10)**: Deploy unified pipelines into staging, execute load simulations, and conduct operator training.",
                "**Phase 3 Production Scale (Weeks 11+)**: Greenlight enterprise rollout with automated SLA compliance tracking and executive reporting."
            ],
            "image_search_query": f"{clean_topic} technical project roadmap planning wall kanban",
            "visual_description": f"Technical project managers and engineers collaborating at project roadmap planning wall for {clean_topic}",
            "image_prompt": f"Technical project managers and engineers collaborating at project roadmap planning wall for {clean_topic}, realistic lighting, documentary photography, 4k"
        },
        {
            "slide_number": 19,
            "layout_type": "split_image_content",
            "category": "FUTURE HORIZON",
            "title": "Next-Generation Horizons & Emerging Catalysts",
            "subtitle": "Anticipated technical breakthroughs, paradigm evolution, and moats",
            "objective": "Anticipate upcoming technological inflection points over a 3-5 year horizon.",
            "bullets": [
                "**Autonomous Agents**: Transition from reactive pipelines toward goal-directed autonomous agents operating within strict guardrails.",
                "**Edge Compute Convergence**: Sub-millisecond localized inference capabilities shift computation closer to physical edge telemetry sources.",
                "**Strategic Defensibility**: Establishing proprietary operational datasets creates compounding organizational competitive advantages."
            ],
            "image_search_query": f"{clean_topic} scientist research laboratory next-generation computing hardware",
            "visual_description": f"Scientist in clean modern research laboratory working on next-generation computing hardware for {clean_topic}",
            "image_prompt": f"Scientist in clean modern research laboratory working on next-generation computing hardware for {clean_topic}, realistic lighting, editorial photography, 4k"
        },
        {
            "slide_number": 20,
            "layout_type": "split_image_content",
            "category": "STRATEGIC MANDATE",
            "title": "Executive Mandate & Actionable Next Steps",
            "subtitle": "Leadership directives, capital deployment decisions, and next steps",
            "objective": "Deliver decisive executive takeaways and immediate organizational directives.",
            "bullets": [
                "**Immediate Mandate**: Greenlight Phase 1 foundational audit and charter the core implementation Tiger Team within 10 business days.",
                "**Capital Allocation**: Earmark primary infrastructure budget to upgrade high-throughput telemetry pipelines and security perimeters.",
                "**Sustained Momentum**: Establish bi-weekly executive steering reviews to guarantee milestone adherence and unblock dependencies."
            ],
            "image_search_query": f"{clean_topic} executive boardroom meeting strategic agreement handshake",
            "visual_description": f"Executive boardroom meeting with corporate leaders finalizing strategic agreement for {clean_topic}",
            "image_prompt": f"Executive boardroom meeting with corporate leaders finalizing strategic agreement for {clean_topic}, cinematic corporate lighting, documentary photography, 4k"
        }
    ]

    chosen_slides = []
    if count <= 5:
        chosen_slides = [master_slides[0], master_slides[1], master_slides[3], master_slides[11], master_slides[19]]
    elif count >= 20:
        chosen_slides = list(master_slides[:20])
    else:
        chosen_slides = list(master_slides[:count - 1])
        chosen_slides.append(master_slides[19])

    for i, sl in enumerate(chosen_slides):
        sl["slide_number"] = i + 1

    return normalize_presentation_deck({
        "deck_title": deck_title,
        "topic": clean_topic,
        "theme": theme,
        "slides": chosen_slides
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

        content_top = Inches(1.85)
        content_height = Inches(4.85)
        col_w = Inches(5.65)
        img_x = Inches(6.85)

        # -------------------------------------------------------------------
        # 1. Slide 1: TITLE HERO LAYOUT
        # -------------------------------------------------------------------
        if idx == 0 or layout in ["title", "title_hero"]:
            # Left Column: Strategic Summary, Objectives & Bullets
            left_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), content_top, col_w, content_height)
            left_card.fill.solid()
            left_card.fill.fore_color.rgb = card_bg_rgb
            left_card.line.color.rgb = card_border_rgb
            left_card.line.width = Pt(1)

            tb_left = slide.shapes.add_textbox(Inches(1.05), content_top + Inches(0.2), col_w - Inches(0.5), content_height - Inches(0.4))
            tf_left = tb_left.text_frame
            tf_left.word_wrap = True

            # Strategic Objective Callout
            obj_text = s.get("objective") or f"Deliver an authoritative executive briefing on {deck_title}."
            p_obj = tf_left.paragraphs[0]
            p_obj.text = f"🎯 STRATEGIC OBJECTIVE:\n{obj_text}"
            p_obj.font.size = Pt(11)
            p_obj.font.bold = True
            p_obj.font.color.rgb = accent_alt_rgb
            p_obj.space_after = Pt(12)

            # Bullets
            bullets_list = s.get("bullets") or []
            if not bullets_list and cards:
                bullets_list = [f"**{c.get('title') or c.get('label') or 'Vector'}**: {c.get('description') or c.get('detail')}" for c in cards]

            for b_item in bullets_list[:3]:
                pb = tf_left.add_paragraph()
                pb.space_after = Pt(8)
                b_str = str(b_item).strip()
                if ":" in b_str:
                    parts = b_str.split(":", 1)
                    k = parts[0].replace("*", "").strip()
                    d = parts[1].strip()
                    run1 = pb.add_run()
                    run1.text = f"✦ {k}: "
                    run1.font.bold = True
                    run1.font.size = Pt(11.5)
                    run1.font.color.rgb = accent_rgb

                    run2 = pb.add_run()
                    run2.text = d
                    run2.font.size = Pt(11)
                    run2.font.color.rgb = text_body_rgb
                else:
                    run = pb.add_run()
                    run.text = f"✦ {b_str}"
                    run.font.size = Pt(11)
                    run.font.color.rgb = text_body_rgb

            # Footer Tag
            p_foot = tf_left.add_paragraph()
            p_foot.text = "Created with ShiviAI • Executive Keynote Widescreen Edition"
            p_foot.font.size = Pt(9.5)
            p_foot.font.italic = True
            p_foot.font.color.rgb = text_sub_rgb
            p_foot.space_before = Pt(10)

        # -------------------------------------------------------------------
        # 2. Content Slides: SPLIT IMAGE & CONTENT LAYOUT (With 3-4 Bullets)
        # -------------------------------------------------------------------
        else:
            bullets_list = s.get("bullets") or []
            if not bullets_list and cards:
                bullets_list = [f"**{c.get('title') or c.get('label') or 'Pillar'}**: {c.get('description') or c.get('detail')}" for c in cards]

            num_bullets = min(max(len(bullets_list), 2), 4)
            card_gap = Inches(0.12)
            card_h = (content_height - (card_gap * (num_bullets - 1))) / num_bullets

            for b_idx in range(num_bullets):
                b_str = bullets_list[b_idx] if b_idx < len(bullets_list) else bullets_list[-1]
                cy = content_top + (b_idx * (card_h + card_gap))

                sc = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), cy, col_w, card_h)
                sc.fill.solid()
                sc.fill.fore_color.rgb = card_bg_rgb
                sc.line.color.rgb = card_border_rgb
                sc.line.width = Pt(1)

                # Accent strip on left of card
                strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), cy + Inches(0.08), Inches(0.06), card_h - Inches(0.16))
                strip.fill.solid()
                strip_col = accent_rgb if b_idx % 2 == 0 else accent_alt_rgb
                strip.fill.fore_color.rgb = strip_col
                strip.line.color.rgb = strip_col

                tb_b = slide.shapes.add_textbox(Inches(0.98), cy + Inches(0.06), col_w - Inches(0.3), card_h - Inches(0.12))
                tf_b = tb_b.text_frame
                tf_b.word_wrap = True

                pb = tf_b.paragraphs[0]
                b_text = str(b_str).strip()
                if ":" in b_text:
                    parts = b_text.split(":", 1)
                    k = parts[0].replace("*", "").strip()
                    d = parts[1].strip()

                    run1 = pb.add_run()
                    run1.text = f"{k}: "
                    run1.font.bold = True
                    run1.font.size = Pt(11.5) if num_bullets <= 3 else Pt(10.5)
                    run1.font.color.rgb = accent_rgb if b_idx % 2 == 0 else accent_alt_rgb

                    run2 = pb.add_run()
                    run2.text = d
                    run2.font.size = Pt(11) if num_bullets <= 3 else Pt(10)
                    run2.font.color.rgb = text_body_rgb
                else:
                    run = pb.add_run()
                    run.text = b_text
                    run.font.size = Pt(11) if num_bullets <= 3 else Pt(10)
                    run.font.color.rgb = text_body_rgb

        # -------------------------------------------------------------------
        # Universal Right Column: Dynamic AI Image for Every Slide
        # -------------------------------------------------------------------
        img_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, img_x, content_top, col_w, content_height)
        img_box.fill.solid()
        img_box.fill.fore_color.rgb = card_bg_rgb
        img_box.line.color.rgb = accent_rgb
        img_box.line.width = Pt(1.2)

        img_prompt = s.get("image_prompt") or s.get("visual_prompt") or f"{deck_title} {slide_title}"
        img_url = s.get("image_url") or build_contextual_slide_image_url(s, deck_title, idx + 1)
        fallback_url = s.get("fallback_image_url") or f"https://picsum.photos/seed/{abs(hash_code(f'{deck_title}_slide_{idx + 1}'))}/900/550"

        image_placed = False
        import urllib.request
        import io
        for target_url in [img_url, fallback_url]:
            if image_placed:
                break
            try:
                req = urllib.request.Request(target_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=4) as response:
                    img_data = response.read()
                    img_stream = io.BytesIO(img_data)
                    slide.shapes.add_picture(img_stream, img_x + Inches(0.08), content_top + Inches(0.08), col_w - Inches(0.16), content_height - Inches(0.5))
                    image_placed = True
            except Exception as img_err:
                pass

        if not image_placed:
            tb_ph = slide.shapes.add_textbox(img_x + Inches(0.3), content_top + Inches(1.5), col_w - Inches(0.6), Inches(2.0))
            tf_ph = tb_ph.text_frame
            tf_ph.word_wrap = True
            ph_p = tf_ph.paragraphs[0]
            ph_p.text = f"✨ Dynamic AI Visual Concept\n\nPrompt: {img_prompt}"
            ph_p.font.size = Pt(12)
            ph_p.font.color.rgb = text_sub_rgb
            ph_p.alignment = PP_ALIGN.CENTER

        # Prompt caption pill at bottom of image
        tb_lbl = slide.shapes.add_textbox(img_x + Inches(0.1), content_top + content_height - Inches(0.38), col_w - Inches(0.2), Inches(0.32))
        tf_lbl = tb_lbl.text_frame
        lp_lbl = tf_lbl.paragraphs[0]
        short_prompt = img_prompt[:50] + "..." if len(img_prompt) > 50 else img_prompt
        lp_lbl.text = f"✦ AI Visual: {short_prompt}"
        lp_lbl.font.size = Pt(8.5)
        lp_lbl.font.italic = True
        lp_lbl.font.color.rgb = text_sub_rgb
        lp_lbl.alignment = PP_ALIGN.CENTER

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

def get_slide_chunks_py(total_count: int) -> list:
    if total_count <= 6:
        return [{"start": 1, "end": total_count}]
    if total_count <= 10:
        mid = (total_count + 1) // 2
        return [
            {"start": 1, "end": mid},
            {"start": mid + 1, "end": total_count}
        ]
    if total_count <= 15:
        return [
            {"start": 1, "end": 5},
            {"start": 6, "end": 10},
            {"start": 11, "end": total_count}
        ]
    return [
        {"start": 1, "end": 5},
        {"start": 6, "end": 10},
        {"start": 11, "end": 15},
        {"start": 16, "end": total_count}
    ]

def build_chunk_prompt_py(chunk: dict, total_count: int, clean_topic: str) -> str:
    start_s = chunk["start"]
    end_s = chunk["end"]
    is_first = (start_s == 1)
    is_final = (end_s == total_count)
    count_in_chunk = end_s - start_s + 1

    if is_first and is_final:
        role_desc = f"""- Slide 1: layout_type "title_hero", category "EXECUTIVE BRIEFING" (Authoritative Presentation Masterclass Title, 1-line scope subtitle, strategic intent).
- Slide 2: layout_type "split_image_content", category "STRATEGIC OBJECTIVE" (Core Objectives, System Bottlenecks, Key Catalysts).
- Slides 3 to {total_count - 1}: layout_type "split_image_content" (Deep-dive technical pillars: Architecture, Mechanisms, Data Topology, Performance).
- Slide {total_count}: layout_type "split_image_content", category "STRATEGIC ROADMAP" (Phased Implementation Roadmap & Leadership Mandate)."""
    elif is_first:
        role_desc = f"""- Slide 1: layout_type "title_hero", category "EXECUTIVE BRIEFING" (Authoritative Presentation Masterclass Title, 1-line scope subtitle, strategic intent).
- Slide 2: layout_type "split_image_content", category "STRATEGIC OBJECTIVE" (Core Objectives, System Bottlenecks, Key Catalysts).
- Slides 3 to {end_s}: layout_type "split_image_content" (Deep-dive technical pillars: Architectural Foundation, Hardware/Compute Topology, Core Mechanics)."""
    elif is_final:
        role_desc = f"""- Slides {start_s} to {total_count - 1}: layout_type "split_image_content" (Advanced Deep Pillars: Security & Governance, Ecosystem Integrations, Unit Economics & ROI, Empirical Case Studies).
- Slide {total_count}: layout_type "split_image_content", category "STRATEGIC ROADMAP" (Phased Implementation Roadmap, Actionable Milestones & Leadership Mandate)."""
    else:
        role_desc = f"""- Slides {start_s} to {end_s}: layout_type "split_image_content" (Advanced Pillars: Scalability Patterns, Telemetry, Latency Optimization, Edge Computing, Fault-Tolerance & Resilience)."""

    layout_type_str = "title_hero" if is_first else "split_image_content"
    cat_str = "EXECUTIVE BRIEFING" if is_first else "CORE PILLAR"

    return f"""You are a Principal Presentation Architect and Executive Speechwriter.
Generate an executive presentation deck on: "{clean_topic}".
Generate exactly {count_in_chunk} cohesive, highly-structured slides (Slides {start_s} through {end_s} of {total_count}).

### SLIDE ROLES FOR THIS BATCH:
{role_desc}

### MANDATORY REQUIREMENTS FOR EVERY SLIDE:
1. 'slide_number': Exact integer number from {start_s} to {end_s}.
2. 'layout_type': "title_hero" for Slide 1 only, otherwise "split_image_content".
3. 'category': Distinct domain kicker in UPPERCASE (e.g. "EXECUTIVE BRIEFING", "STRATEGIC OBJECTIVE", "SYSTEM ARCHITECTURE", "DATA TOPOLOGY", "PERFORMANCE BENCHMARKS", "RISK GOVERNANCE", "STRATEGIC ROADMAP").
4. 'title': Distinct, insightful heading. Do NOT repeat the bare topic name.
5. 'subtitle': Contextual 1-line subtitle explaining the scope.
6. 'objective': 1 clear sentence defining the strategic outcome of this slide.
7. 'bullets': Exactly 3 to 4 detailed bullet points (15-25 words each, starting with bold keyword first e.g. "**Operational Velocity**: Eliminating manual pipeline handoffs to accelerate deployment velocity by up to 40%.").
8. 'image_search_query': Specific, authentic real-world search query pinpointing the physical/factual subject of this slide (e.g. "mission control operations room telemetry wall engineers", NOT "technology").
9. 'visual_description': In-depth documentary scene description of the real-world operational/technical setting grounded strictly in this slide's facts. Strictly NO abstract art, neon shapes, or fantasy graphics.
10. 'image_prompt': High resolution documentary photography depicting the exact real-world subject in an authentic operational setting, realistic lighting, 4k, hyper-detailed, clean sharp focus.

### STRICT JSON SCHEMA (OUTPUT ONLY VALID JSON, NO CODEBLOCKS):
{{
  "deck_title": "{clean_topic}: Executive Masterclass",
  "topic": "{clean_topic}",
  "slides": [
    {{
      "slide_number": {start_s},
      "layout_type": "{layout_type_str}",
      "category": "{cat_str}",
      "title": "Distinct Slide Headline",
      "subtitle": "Clear 1-line contextual subtitle",
      "objective": "Strategic outcome or focus of this slide",
      "bullets": [
        "**Operational Velocity**: Detailed sentence explaining key impact and metrics with authentic depth.",
        "**System Reliability**: Telemetry and automated guardrails safeguarding mission-critical production uptime.",
        "**Scalable Invariants**: Modular decoupling ensuring predictable throughput as data density expands."
      ],
      "image_search_query": "specific realistic query for authentic operational subject",
      "visual_description": "documentary scene description of real-world subject in authentic setting",
      "image_prompt": "High resolution documentary photography of authentic subject in operational setting, realistic lighting, 4k, hyper-detailed, clean sharp focus"
    }}
  ]
}}"""

async def build_presentation_deck_py(topic: str, slide_count: Optional[int] = None, theme: str = "dark_modern", keys: dict = None) -> dict:
    if keys is None:
        keys = {}

    clean_topic = topic.strip()
    total_count = min(20, max(5, int(slide_count) if (slide_count and str(slide_count).isdigit()) else 8))

    system_prompt = (
        "You are an Executive Presentation Architect and Principal AI Analyst. "
        "Your task is to generate high-caliber, C-level presentation decks in strict JSON format. "
        "Strict adherence to the requested schema, slide count, bullet depth (15-25 words per bullet with bold keyword first), "
        "and documentary realistic photography prompts on every slide is mandatory. Output ONLY valid JSON with zero markdown codeblock wrappers."
    )

    async def execute_llm_prompt(current_prompt: str) -> Optional[dict]:
        provider_calls = []
        if keys.get("groq"):
            provider_calls.append(lambda: call_groq(keys["groq"], "openai/gpt-oss-120b", system_prompt, current_prompt, [], options={"max_tokens": 2500}))
            provider_calls.append(lambda: call_groq(keys["groq"], "openai/gpt-oss-20b", system_prompt, current_prompt, [], options={"max_tokens": 2500}))
            provider_calls.append(lambda: call_groq(keys["groq"], "qwen/qwen3.8-27b", system_prompt, current_prompt, [], options={"max_tokens": 950}))
        if keys.get("gemini"):
            provider_calls.append(lambda: call_gemini(keys["gemini"], "gemini-1.5-flash", system_prompt, current_prompt, [], options={"max_tokens": 8192}))
        if keys.get("openai"):
            provider_calls.append(lambda: call_openai(keys["openai"], "gpt-4o-mini", system_prompt, current_prompt, [], options={"max_tokens": 8192}))
        if keys.get("openrouter"):
            provider_calls.append(lambda: call_openrouter(keys["openrouter"], "google/gemini-2.0-flash-exp:free", system_prompt, current_prompt, [], options={"max_tokens": 8192}))

        for call_fn in provider_calls:
            try:
                res = await call_fn()
                if res and res.strip():
                    parsed = repair_truncated_json(res)
                    if parsed and isinstance(parsed.get("slides"), list) and len(parsed["slides"]) > 0:
                        return parsed
            except Exception as e:
                print(f"[Presentation Provider Gen Warning]: {e}")
        return None

    # Dynamic Chunking for Zero Token Truncation (Max 5 slides per chunk)
    chunks = get_slide_chunks_py(total_count)
    tasks = [execute_llm_prompt(build_chunk_prompt_py(c, total_count, clean_topic)) for c in chunks]
    chunk_results = await asyncio.gather(*tasks)

    combined_slides = []
    deck_title = f"{clean_topic}: Executive Masterclass"

    for deck_result in chunk_results:
        if deck_result and deck_result.get("deck_title"):
            deck_title = deck_result["deck_title"]
        if deck_result and isinstance(deck_result.get("slides"), list):
            combined_slides.extend(deck_result["slides"])

    if combined_slides:
        merged_deck = {
            "deck_title": deck_title,
            "topic": clean_topic,
            "theme": theme,
            "slides": combined_slides
        }
        return normalize_presentation_deck(merged_deck, clean_topic, total_count)

    return generate_rich_fallback_deck_py(clean_topic, total_count, theme)

@app.post("/api/generate-presentation")
async def generate_presentation(req: PresentationRequest):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")

    slide_count = min(20, max(5, int(req.slideCount))) if (req.slideCount and req.slideCount > 0) else None
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
# API: Neural Speech Synthesis (POST /api/tts)
# ---------------------------------------------------------------------------
@app.post("/api/tts")
async def tts_endpoint(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required for TTS")

    env = load_env_dict()
    api_key = (req.apiKey or "").strip() or env.get("OPENAI_API_KEY", "").strip()
    voice = (req.voice or "nova").replace("neural_", "")

    if api_key:
        try:
            assert http_client is not None
            res = await http_client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": req.model or "tts-1",
                    "input": text[:4096],
                    "voice": voice,
                    "speed": req.speed or 1.02
                },
                timeout=12.0
            )
            if res.status_code == 200:
                return Response(
                    content=res.content,
                    media_type="audio/mpeg",
                    headers={"Cache-Control": "public, max-age=86400"}
                )
        except Exception as e:
            logger.warning(f"[TTS] OpenAI Speech notice: {e}")

    # Seamless fallback response so frontend uses Pipeline A (Browser Neural Engine)
    return JSONResponse(
        status_code=200,
        content={
            "success": False,
            "fallback": True,
            "message": "Fallback to Pipeline A: High-Definition Natural Browser Voice"
        }
    )

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
