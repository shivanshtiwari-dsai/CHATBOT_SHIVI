# 🌟 Shivi AI — Next-Generation Intelligent Assistant & Chatbot

<div align="center">

![Shivi AI Banner](https://img.shields.io/badge/Shivi%20AI-v2.5.0-6366f1?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=for-the-badge&logo=python&logoColor=white)

**An intelligent conversational assistant, presentation engine, and multi-model AI workspace crafted with a futuristic glassmorphic interface.**

[Features](#-features) • [Quick Start](#-quick-start) • [Environment Setup](#-environment-setup) • [Architecture](#-architecture) • [License](#-license)

</div>

---

## ✨ Features

- 🧠 **Multi-Provider AI Intelligence**: Seamlessly switch between **Google Gemini**, **Groq Cloud** (ultra-fast Llama 3 / Mixtral), **OpenAI** (GPT-4o), and **OpenRouter**.
- 🎨 **AI Image Generation**: Built-in support for **Pollinations.ai** (free, no key needed) and **DALL-E 3**.
- 📊 **Presentation Engine**: Export beautiful PowerPoint presentations on demand (`pptxgenjs`).
- 🎙️ **Voice & Speech Synthesis**: Speech-to-text voice recognition and instant text-to-speech audio playback.
- 🧬 **Brain Knowledge System**: Configurable custom memory, facts, and RAG knowledge base via `knowledge.json`.
- 🔐 **Authentication System**: Local secure accounts plus Google & GitHub OAuth integration.
- 💎 **Modern UI/UX**: Premium dark theme with fluid glassmorphism, responsive controls, and micro-animations.

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/shivanshtiwari-dsai/CHATBOT_SHIVI.git
cd CHATBOT_SHIVI
```

### 2. Configure Environment Variables
Copy the example template and add your API keys:
```bash
# On Windows
copy .env.example .env

# On macOS/Linux
cp .env.example .env
```

Edit `.env` to supply your API keys (e.g. Gemini, Groq, OpenAI). At least one provider key is recommended (Groq or Gemini are free).

### 3. Install Dependencies
```bash
# Node.js dependencies
npm install

# Python dependencies (optional for Python services)
pip install -r requirements.txt
```

### 4. Run the Application

#### Option A: One-Click Launcher (Windows)
Double-click `launch_shivi_ai.bat` or run:
```bat
run.bat
```

#### Option B: Start via Node.js
```bash
npm start
```
Then visit **`http://localhost:5500`** in your browser.

---

## ⚙️ Environment Setup (`.env`)

| Variable | Description | Recommended / Free? |
| :--- | :--- | :--- |
| `PORT` | Local web server port (default: `5500`) | Optional |
| `GROQ_API_KEY` | Ultra-fast LLaMA & Mixtral models | Free (console.groq.com) |
| `GEMINI_API_KEY` | Google Gemini 1.5 / 2.0 Flash & Pro | Free (aistudio.google.com) |
| `OPENAI_API_KEY` | GPT-4o & DALL-E 3 | Paid |
| `OPENROUTER_API_KEY` | Diverse multi-model gateway | Free / Paid |
| `IMAGE_PROVIDER` | `pollinations` or `openai` | `pollinations` (Free) |

---

## 📁 Project Structure

```text
├── index.html            # Main web application interface
├── style.css             # Glassmorphic styles and animations
├── app.js                # Core frontend client logic & interactions
├── brain.js              # Knowledge base & client-side AI controller
├── server.js             # Node.js backend server & API proxy
├── python_server.py      # Python backend services
├── shivi.py              # CLI and utility automation
├── knowledge.json        # Custom knowledge base & system instructions
├── package.json          # Node dependencies and scripts
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
└── .gitignore            # Protected files & secrets ignore list
```

---

## 🔒 Security & Privacy

- Sensitive API keys and credentials are saved in `.env` and **never committed to version control**.
- Local user records are stored in `users.json` with cryptographic password salts and hashes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
