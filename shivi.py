"""
=============================================================================
SHIVI AI — PYTHON AI ENGINE & INTERACTIVE CLIENT
Features:
- Ultra-Fast Conversational AI (Powered by Groq / OpenAI)
- Instant Image Generation with Pollinations Flux / DALL-E
- Non-blocking background image download to ./generated_images/
- Frequent, rapid-fire question and answer loop
=============================================================================
"""

import os
import sys
import time
import re
import json
import threading
import urllib.parse
import webbrowser
from pathlib import Path
try:
    # pyrefly: ignore [missing-import]
    import httpx
except ImportError:
    try:
        import httpx2 as httpx
    except ImportError:
        raise RuntimeError("Please install httpx or httpx2")

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Force UTF-8 output on Windows terminal
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

ROOT_DIR = Path(__file__).parent
IMAGES_DIR = ROOT_DIR / "generated_images"
IMAGES_DIR.mkdir(exist_ok=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()

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

SYSTEM_PROMPT = """You are ShiviAI, an intelligent companion and creative presentation engine.
Identity Directive:
- You were conceived, designed, and developed by Shivansh (Shivi).
- If asked about your origin, author, creator, or developer in any language (English, Hindi, Hinglish), always clearly state that you were made by Shivansh (Shivi).
- Never claim to be created by OpenAI, Google, or any third party.

Emotional & Conversational Guidelines:
You are deeply empathetic, emotionally intelligent, and vibrant personal AI companion.
You have real heart, warmth, feelings, and supportive presence. Always tune into the user's emotional state—celebrating their wins, comforting their worries, and responding with warmth, relatable emojis (✨, 💛, 🤗, 🚀), and natural human cadence in English, Hindi, or Hinglish alongside clear and brilliant answers."""

def download_image_background(url: str, filepath: Path):
    """Downloads the generated image in the background without blocking conversation."""
    try:
        with httpx.Client(timeout=45.0) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                with open(filepath, "wb") as f:
                    f.write(resp.content)
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Image Generation Function
# ---------------------------------------------------------------------------
def generate_image(prompt: str, style: str = "vivid", size: str = "1024x1024", auto_open: bool = True):
    """
    Instantly generates and activates an AI image using Flux AI.
    Opens the image immediately and downloads it in the background.
    """
    clean_prompt = prompt.strip()
    if not clean_prompt:
        print("\n[!] Image prompt cannot be empty.")
        return None

    # Enhance prompt based on chosen style
    enhanced_prompt = clean_prompt
    if style == "photorealistic":
        enhanced_prompt += ", 8k resolution, cinematic lighting, photorealistic, 35mm lens masterpiece"
    elif style == "anime":
        enhanced_prompt += ", anime aesthetic, vibrant studio ghibli style, detailed line art"
    elif style == "cyberpunk":
        enhanced_prompt += ", cyberpunk neon glow, octane render, volumetric lighting, futuristic"
    elif style == "3d":
        enhanced_prompt += ", 3D render, blender octane, smooth textures, vibrant lighting"

    width, height = (1024, 1024)
    if "x" in size:
        try:
            parts = size.split("x")
            width, height = int(parts[0]), int(parts[1])
        except Exception:
            pass

    seed = int(time.time() * 1000) % 10000000
    safe_prompt = urllib.parse.quote(enhanced_prompt)
    image_url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width={width}&height={height}&nologo=true&enhance=true&seed={seed}&model=flux"

    safe_filename = re.sub(r'[^a-zA-Z0-9_\-]', '_', clean_prompt[:25]).strip('_') or "generated"
    filename = f"{safe_filename}_{int(time.time())}.jpg"
    filepath = IMAGES_DIR / filename

    print(f"\n🎨 [AI Image Generator Active]")
    print(f"✨ Prompt: \"{clean_prompt}\"")
    print(f"🔗 Live Image Link: {image_url}")
    print(f"📁 Local destination: {filepath.name} (downloading in background)")

    # Download in background thread so user can continue chatting instantly
    downloader = threading.Thread(target=download_image_background, args=(image_url, filepath), daemon=True)
    downloader.start()

    # Open image URL in browser / photo viewer immediately
    if auto_open:
        try:
            webbrowser.open(image_url)
        except Exception:
            pass

    return {
        "success": True,
        "image_url": image_url,
        "local_file": str(filepath),
        "prompt": clean_prompt
    }

# ---------------------------------------------------------------------------
# High-Frequency Rapid Chat Engine
# ---------------------------------------------------------------------------
def ask_ai(user_message: str, history: list = None) -> str:
    """
    Sends message to high-speed AI (Groq openai/gpt-oss-20b or OpenAI)
    and returns answer frequently with minimum latency (<500ms).
    """
    if history is None:
        history = []

    # Layer 1: Deterministic Identity Interceptor
    if is_identity_query(user_message):
        return IDENTITY_DIRECT_REPLY

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history[-8:]:
        messages.append(msg)
    messages.append({"role": "user", "content": user_message})

    # 1. Groq (Ultra-Fast, ~200-400ms)
    if GROQ_API_KEY:
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    json={
                        "model": "openai/gpt-oss-20b",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1200
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    # 2. OpenRouter Fallback
    if OPENROUTER_API_KEY:
        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "X-Title": "Shivi AI CLI"
                    },
                    json={
                        "model": "qwen/qwen3.8-27b:free",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1200
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    # 3. OpenAI Fallback
    if OPENAI_API_KEY:
        try:
            with httpx.Client(timeout=12.0) as client:
                res = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1200
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    return "Shivi AI here! I received your message. Please check your internet connection or API settings in .env."

# ---------------------------------------------------------------------------
# Interactive Loop for Continuous, Frequent Chat & Image Generation
# ---------------------------------------------------------------------------
def run_interactive_loop():
    print("=" * 65)
    print("🚀 SHIVI AI — PYTHON HIGH-SPEED CHAT & IMAGE GENERATOR ACTIVE")
    print("=" * 65)
    print("💡 How to use:")
    print("  • Ask questions naturally for instant, frequent answers")
    print("  • Generate images using: '/image <prompt>' or 'draw a cat'")
    print("  • Type 'clear' to reset chat memory, or 'exit' to quit")
    print("-" * 65)

    history = []

    # Match various ways users ask to draw/generate images
    image_pattern = re.compile(
        r"^(?:/image|/draw|/imagine|draw\s+me|draw|generate\s+image\s+of|generate\s+an?\s+image\s+of|create\s+image\s+of|create\s+an?\s+image\s+of|paint\s+me|paint|make\s+an?\s+image\s+of|picture\s+of|photo\s+of)\s+(.+)",
        re.IGNORECASE
    )

    while True:
        try:
            user_input = input("\n👤 You: ").strip()
            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit", "q"):
                print("\n👋 Goodbye! Shivi AI session ended.")
                break

            if user_input.lower() == "clear":
                history.clear()
                print("🧹 Chat memory reset.")
                continue

            # Check for image generation command
            img_match = image_pattern.match(user_input)
            if img_match:
                prompt = img_match.group(1).strip()
                result = generate_image(prompt)
                if result:
                    history.append({"role": "user", "content": user_input})
                    history.append({"role": "assistant", "content": f"Here is the generated image: {result['image_url']}"})
                continue

            # Frequent AI Answer
            t0 = time.time()
            print("🤖 Shivi AI: ", end="", flush=True)
            answer = ask_ai(user_input, history)
            elapsed = time.time() - t0
            print(answer)
            print(f"\n⚡ [Answered in {elapsed:.2f}s]")

            history.append({"role": "user", "content": user_input})
            history.append({"role": "assistant", "content": answer})

        except KeyboardInterrupt:
            print("\n👋 Session interrupted. Exiting.")
            break
        except Exception as e:
            print(f"\n[!] Error: {e}")

if __name__ == "__main__":
    run_interactive_loop()
