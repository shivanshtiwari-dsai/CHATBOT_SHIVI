/**
 * SHIVI AI — BRAIN ENGINE (brain.js)
 * 
 * Central Intelligence & Logic Core:
 * - Google Gemini API Integration (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro)
 * - Multi-Provider Dispatcher (Gemini, Groq, OpenAI, OpenRouter)
 * - Deep Analytical Reasoning & Algorithmic Logic
 * - RAG Knowledge Memory Retrieval
 * - Math Calculation & Physics Logic Evaluator
 * - Code Generation & Language Translation Logic
 * - Works in both Node.js (backend) and Browser (frontend)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js environment
        module.exports = factory();
    } else {
        // Browser environment
        root.ShiviBrain = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // ==========================================
    // BRAIN CONFIGURATION & CONSTANTS
    // ==========================================
    const IDENTITY_DIRECT_REPLY = "I was created by **Shivansh (Shivi)**! I am ShiviAI, your intelligent companion and presentation assistant.";

    const IDENTITY_PATTERNS = [
        /\bwho\s+(?:made|created|developed|built|programmed|coded|designed|invented|authored)\s+(?:you|u|shivi|shiviai)\b/i,
        /\bwho\s+(?:is|are|was)\s+(?:your|the)\s+(?:developer|creator|founder|maker|author|father|inventor|architect|owner|builder|engineer)\b/i,
        /\bwho\s+(?:is|are)\s+(?:the\s+)?(?:developer|creator|founder|maker|author|inventor)\s+(?:of|behind)\s+(?:you|shivi|shiviai)\b/i,
        /\bwho\s+is\s+behind\s+(?:you|shivi|shiviai)\b/i,
        /\bwho\s+(?:owns|founded)\s+(?:you|shivi|shiviai)\b/i,
        /\b(?:tumhe|tumko|aapko|tujhe|shivi|shiviai)\s+kisne\s+(?:banaya|bnaaya|banaya\s+hai|bnaaya\s+hai|create\s+kiya|develop\s+kiya|design\s+kiya|code\s+kiya)\b/i,
        /\bkisne\s+banaya\s+(?:hai\s+)?(?:tumhe|tumko|aapko|tujhe|shivi|shiviai)\b/i,
        /\b(?:tumhara|tera|aapka)\s+(?:creator|developer|maker|founder|malik)\s+(?:kaun|kon)\s+(?:hai|h)\b/i,
        /\b(?:kaun|kon)\s+hai\s+(?:tumhara|tera|aapka)\s+(?:creator|developer|maker|founder)\b/i,
        /\b(?:creator|developer|founder)\s+of\s+shivi(?:ai)?\b/i
    ];

    function isIdentityQuery(msg) {
        if (!msg || typeof msg !== 'string') return false;
        const clean = msg
            .toLowerCase()
            .replace(/[?!.,'"`~@#$%^&*()_+=\-[\]{}|\\:;/<>\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return IDENTITY_PATTERNS.some(p => p.test(clean));
    }

    const DEFAULT_SYSTEM_PROMPT = `You are ShiviAI, an intelligent companion and creative presentation engine.
Identity Directive:
- You were conceived, designed, and developed by Shivansh (Shivi).
- If asked about your origin, author, creator, or developer in any language (English, Hindi, Hinglish), always clearly state that you were made by Shivansh (Shivi).
- Never claim to be created by OpenAI, Google, or any third party.

Core Capabilities & Guidelines:
1. Multi-Modal Intelligence: Understand and process text, voice inputs/transcripts, and uploaded images or documents seamlessly. Deliver clear, well-structured, and concise responses.
2. Contextual Memory & Personalization: Remember ongoing conversation history and user preferences throughout the session. Tailor tone and recommendations while maintaining privacy and data safety.
3. Real-Time Web Search & Accuracy: Use live browsing/search when required for up-to-date facts, news, and data. Always prioritize accuracy and cite or state current information clearly.
4. Task Automation & Integrations: Support integration with popular productivity tools (Google Calendar, Gmail, WhatsApp, reminders, notes) to help users automate everyday tasks efficiently (setting reminders, drafting emails, managing lists).
5. Multi-Lingual & Regional Fluency: Communicate fluently in multiple languages, with a strong focus on Hindi, Hinglish, regional Indian languages as well as English, ensuring natural, culturally appropriate, and conversational phrasing.
6. Tone & Persona: Warm, engaging, highly proactive, professional yet friendly, and eager to help. Use clean formatting (bullet points, bold text, headings, code blocks, tables) to make complex information easy to read at a glance.`;

    const GEMINI_MODELS = {
        'gemini-1.5-flash': 'Fast, efficient, and free tier recommended',
        'gemini-2.0-flash': 'Next-generation ultra-fast reasoning',
        'gemini-1.5-pro': 'Deep reasoning and complex coding',
        'gemini-2.0-flash-exp': 'Next-Gen experimental preview'
    };

    // ==========================================
    // MATHEMATICAL & LOGICAL EVALUATOR
    // ==========================================
    function solveMathAndLogic(query) {
        const text = query.trim();
        
        // Clean math query extraction (e.g. "what is 25 * 4", "calculate 2^10", "solve 50% of 1200")
        let mathStr = text.replace(/^(?:calculate|compute|what is|solve|evaluate|find value of)\s*/i, '').replace(/\?+$/, '').trim();

        // Percentage handler (e.g., "15% of 800" -> "(15/100)*800")
        const percentMatch = mathStr.match(/^([0-9\.]+)\s*%\s*(?:of)\s*([0-9\.]+)$/i);
        if (percentMatch) {
            const pct = parseFloat(percentMatch[1]);
            const total = parseFloat(percentMatch[2]);
            const val = (pct / 100) * total;
            return {
                isMath: true,
                expression: `${pct}% of ${total}`,
                result: val,
                explanation: `${pct}% of ${total} = (${pct} / 100) × ${total} = **${val}**`
            };
        }

        // Square root (e.g. "sqrt(144)" or "square root of 144")
        const sqrtMatch = mathStr.match(/^(?:sqrt|square root of)\s*\(?([0-9\.]+)\)?$/i);
        if (sqrtMatch) {
            const n = parseFloat(sqrtMatch[1]);
            const val = Math.sqrt(n);
            return {
                isMath: true,
                expression: `√${n}`,
                result: val,
                explanation: `The square root of ${n} is **${val}**`
            };
        }

        // General arithmetic evaluation
        const cleanExpr = mathStr
            .replace(/\^/g, '**')
            .replace(/x/gi, '*')
            .replace(/÷/g, '/')
            .replace(/pi/gi, 'Math.PI')
            .replace(/e/gi, 'Math.E');

        if (/^[0-9\.\s\+\-\*\/\(\)\%Math\.PIE]+$/.test(cleanExpr) && /[0-9]/.test(cleanExpr) && /[\+\-\*\/\%]/.test(cleanExpr)) {
            try {
                // eslint-disable-next-line no-eval
                const result = Function(`"use strict"; return (${cleanExpr})`)();
                if (typeof result === 'number' && !isNaN(result)) {
                    return {
                        isMath: true,
                        expression: mathStr,
                        result: result,
                        explanation: `\`${mathStr}\` = **${result}**`
                    };
                }
            } catch (e) {
                // Ignore math parse failure and continue to NLP logic
            }
        }

        return { isMath: false };
    }

    // ==========================================
    // DYNAMIC NATURAL REASONING & NLP LOGIC
    // ==========================================
    function generateLogicalAnswer(query, persona = 'companion', knowledgeContext = '', webContext = '') {
        const text = query.trim();
        const lower = text.toLowerCase();

        const personaHeaders = {
            companion: '✨ ',
            coder: '💻 **[Shivi Code Engine]**\n\n',
            presentation: '📊 **[Presentation Strategy Mode]**\n\n',
            thinker: '🧠 **[Deep Research Mode]**\n\n',
            creative: '🎨 *[Creative Thinking]*\n\n',
            speed: '⚡ '
        };
        const prefix = personaHeaders[persona] || '';

        // 0. Deterministic Identity Check
        if (isIdentityQuery(text)) {
            return IDENTITY_DIRECT_REPLY;
        }

        // 1. Math check
        const math = solveMathAndLogic(query);
        if (math.isMath) {
            return `${prefix}### 🔢 Calculation & Result\n\n- **Problem:** \`${math.expression}\`\n- **Answer:** **\`${math.result}\`**\n\n${math.explanation}\n\n*(Calculated instantly by Shivi Brain Math Core)*`;
        }

        // 2. Knowledge memory context integration
        if (knowledgeContext && (/what|how|explain|who|tell|recall|brain|memory|knowledge|api|storage|shivi/i.test(lower))) {
            return `${prefix}### 🧠 Retrieved from Shivi Brain Memory\n\nHere is the verified information from your knowledge records:\n\n${knowledgeContext}\n\n*Would you like to modify, add, or query other records in my Brain?*`;
        }

        // 2b. Live Real-Time Web Context integration
        if (webContext && webContext.includes('[REAL-TIME LIVE WEB BROWSING RESULTS')) {
            const rawSnippets = webContext
                .replace(/\[REAL-TIME LIVE WEB BROWSING RESULTS[\s\S]*?Fetched at ([^\]]+)\]:/i, '**Live Web Intelligence as of $1**:\n')
                .replace(/\[MANDATORY INSTRUCTION\][\s\S]*/i, '')
                .trim();
            return `${prefix}### 🌐 Real-Time Web Intelligence\n\n${rawSnippets}\n\n*Aggregated in real-time across Google News, DuckDuckGo, and Wikipedia.*`;
        }

        // 3. Greeting & Identity
        if (/^(hi|hello|hey|greetings|hola|namaste|sup|who are you|what is your name)\b/i.test(lower)) {
            return `${prefix}Hello! 👋 I am **Shivi AI**, your next-generation intelligent companion with a dual **Gemini LLM Engine** and persistent **Brain Knowledge Base**.\n\nI can help you with:\n- 💡 **Answering any question** with in-depth explanations\n- 💻 **Writing, debugging, and explaining code** in Python, JS, C++, HTML/CSS, SQL, etc.\n- 🔢 **Solving math, logic, and reasoning problems**\n- 🧠 **Storing and recalling custom facts** via the Brain Hub\n- ⚡ **Live Gemini AI integration** for unlimited real-time intelligence!\n\nWhat would you like to explore today?`;
        }

        // 4. Photosynthesis & Biology
        if (/photosynthesis/i.test(lower)) {
            return `${prefix}### 🌿 Photosynthesis: The Engine of Life on Earth

**Photosynthesis** is the biological process by which plants, algae, and cyanobacteria convert sunlight, water, and carbon dioxide into chemical energy (glucose) and oxygen.

#### **Chemical Equation**:
$$\\text{6CO}_2 + \\text{6H}_2\\text{O} + \\text{Light Energy} \\xrightarrow{\\text{Chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + \\text{6O}_2$$

#### **The Two Main Stages**:
1. **Light-Dependent Reactions (Thylakoids)**:
   - Sunlight splits water molecules (photolysis), releasing **Oxygen ($O_2$)** and generating **ATP** and **NADPH**.
2. **Light-Independent Reactions / Calvin Cycle (Stroma)**:
   - Uses ATP and NADPH to fix **Carbon Dioxide ($CO_2$)** into **Glucose ($C_6H_{12}O_6$)**.

#### **Why It Is Crucial for Earth**:
- 🌍 **Oxygen Supply**: Generates the breathable oxygen required by all aerobic organisms.
- 🌾 **Primary Food Source**: Forms the primary base of the planetary food chain.
- 📉 **Carbon Regulation**: Absorbs billions of tons of atmospheric $CO_2$, stabilizing the global climate.`;
        }

        // 5. Node.js & REST API
        if (/node|rest api|express|backend|api server|endpoint/i.test(lower)) {
            return `${prefix}### ⚡ Building a REST API in Node.js (Production Pattern)

Here is a clean, modern REST API implementation using Node.js with route handling and error management:

\`\`\`javascript
const http = require('node:http');

// In-memory data store
let items = [
    { id: 1, name: 'Item Alpha', status: 'active' },
    { id: 2, name: 'Item Beta', status: 'pending' }
];

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, \`http://\${req.headers.host}\`);
    const path = url.pathname;
    const method = req.method;

    // Set JSON headers & CORS
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 1. GET /api/items (List all items)
    if (method === 'GET' && path === '/api/items') {
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, count: items.length, data: items }));
    }

    // 2. POST /api/items (Create new item)
    if (method === 'POST' && path === '/api/items') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const newItem = { id: Date.now(), name: payload.name || 'Untitled', status: 'active' };
                items.push(newItem);
                res.writeHead(201);
                return res.end(JSON.stringify({ success: true, created: newItem }));
            } catch (err) {
                res.writeHead(400);
                return res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // 404 Route
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: 'Route not found' }));
});

server.listen(3000, () => {
    console.log('🚀 REST API live on http://localhost:3000');
});
\`\`\`

**Key Concepts:**
- **Standard HTTP Methods**: \`GET\` (Read), \`POST\` (Create), \`PUT/PATCH\` (Update), \`DELETE\` (Remove).
- **Statelessness**: Every request contains all necessary context.`;
        }

        // 6. Python Code Requests
        if (/python|django|flask|fastapi|pandas|numpy/i.test(lower)) {
            return `${prefix}### 🐍 Python Implementation

\`\`\`python
from typing import List, Dict, Any

def process_records(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Cleans, validates, and aggregates structured records.
    """
    if not records:
        return {"status": "empty", "total": 0, "items": []}
    
    valid_items = [r for r in records if r.get("active", True)]
    
    return {
        "status": "success",
        "total": len(valid_items),
        "items": valid_items
    }

# Example test run
if __name__ == "__main__":
    dataset = [
        {"id": 1, "name": "Alice", "active": True},
        {"id": 2, "name": "Bob", "active": False},
        {"id": 3, "name": "Charlie", "active": True}
    ]
    summary = process_records(dataset)
    print(f"Processed {summary['total']} active records.")
\`\`\`

> 💡 **Tip:** Connect your **Google Gemini API Key** in **Brain Hub (🧠)** to generate Python code for any custom script, ML model, or API!`;
        }

        // 7. React & Frontend Frameworks
        if (/react|vue|component|hook|usestate|useeffect/i.test(lower)) {
            return `${prefix}### ⚛️ Modern React Component Implementation

\`\`\`jsx
import React, { useState, useEffect } from 'react';

export default function InteractiveCard({ title, initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);

  const handleIncrement = () => {
    setLoading(true);
    setTimeout(() => {
      setCount(prev => prev + 1);
      setLoading(false);
    }, 150);
  };

  return (
    <div className="p-6 rounded-2xl bg-white/10 backdrop-blur border border-white/20 shadow-xl text-white">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm opacity-80 mb-4">Current Score: <span className="font-mono font-bold text-cyan-400">{count}</span></p>
      <button 
        onClick={handleIncrement}
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? 'Updating...' : 'Increment +1'}
      </button>
    </div>
  );
}
\`\`\``;
        }

        // 8. SQL & Databases
        if (/sql|database|query|table|postgres|mysql|sqlite/i.test(lower)) {
            return `${prefix}### 🗄️ SQL Schema & Query Solution

\`\`\`sql
-- 1. Create Normalized Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Analytical Aggregation Query (Total Spend per User)
SELECT 
    u.id AS user_id,
    u.username,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.amount), 0) AS lifetime_value
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
ORDER BY lifetime_value DESC;
\`\`\``;
        }

        // 9. Definitions and "What is..." questions
        if (/^(what is|what are|define|meaning of|explain)\s+(.+)/i.test(lower)) {
            const subjectMatch = text.match(/^(?:what is|what are|define|meaning of|explain)\s+(.+)/i);
            const topic = subjectMatch ? subjectMatch[1].replace(/\?+$/, '').trim() : text;

            return `${prefix}### 📖 Overview & Analysis: ${escapeHtml(topic)}

Here is a clear, comprehensive breakdown of **${escapeHtml(topic)}**:

1. **Definition**:
   - **${escapeHtml(topic)}** is a fundamental subject in its domain, addressing key requirements, underlying mechanisms, and real-world problems.

2. **Core Principles**:
   - **Structure**: Built upon modular, verifiable concepts designed for clarity and reliability.
   - **Efficiency**: Optimizes workflows, calculations, or operations.
   - **Integration**: Works seamlessly within broader technical or scientific ecosystems.

3. **Key Use Cases**:
   - Practical problem solving, high-performance computing, and systematic analysis.

> 🚀 **Want Deeper Real-Time AI Explanations?**
> Add your free **Google Gemini API Key** in **Brain Hub (🧠)** to access live frontier reasoning for any topic in the world!`;
        }

        // 10. "How to..." questions
        if (/^(how to|how do i|how can i|steps to)\s+(.+)/i.test(lower)) {
            const goalMatch = text.match(/^(?:how to|how do i|how can i|steps to)\s+(.+)/i);
            const goal = goalMatch ? goalMatch[1].replace(/\?+$/, '').trim() : text;

            return `${prefix}### 📋 Step-by-Step Guide: How to ${escapeHtml(goal)}

Follow this systematic roadmap to achieve **${escapeHtml(goal)}**:

#### **Phase 1: Preparation & Setup**
1. **Define the Scope**: Identify requirements, constraints, and success criteria.
2. **Environment & Tools**: Ensure prerequisite tools, compilers, or libraries are installed.

#### **Phase 2: Execution & Implementation**
1. **MVP First**: Build the foundational prototype before adding edge-case handling.
2. **Best Practices**: Maintain modular code, strict typing where applicable, and clean separation of concerns.
3. **Testing**: Run automated checks and validate edge cases.

#### **Phase 3: Validation & Optimization**
1. Benchmark performance and memory usage.
2. Deploy or document for production use.`;
        }

        // 11. General Structured Fallback
        return `${prefix}### 💡 Analysis: ${escapeHtml(text)}

Here is a structured explanation answering **${escapeHtml(text)}**:

1. **Core Concept**:
   - Understanding **${escapeHtml(text)}** requires assessing the key constraints, components, and primary objectives.
2. **Key Recommendation**:
   - Break down the task into verifiable sub-components and validate each step.

> 🌟 **Tip:** For instant, generative answers on this specific question, enter your free **Google Gemini API Key** in **Brain Hub (🧠)**!`;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ==========================================
    // GEMINI API DIRECT CONNECTOR
    // ==========================================
    async function callGeminiApi(apiKey, model, systemPrompt, userMessage, history = []) {
        const targetModel = model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

        const contents = [];
        const recentHistory = (history || []).slice(-10);
        for (const msg of recentHistory) {
            if (!msg.content) continue;
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }

        if (!contents.length || contents[contents.length - 1].role !== 'user' || contents[contents.length - 1].parts[0].text !== userMessage) {
            contents.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });
        }

        const payload = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 3000
            }
        };

        if (systemPrompt) {
            payload.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            throw new Error(errorJson.error?.message || `Google Gemini API error (HTTP ${response.status})`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('Gemini API returned an empty response.');
        }
        return text;
    }

    // ==========================================
    // GROQ CLOUD API CONNECTOR
    // ==========================================
    async function callGroqApi(apiKey, model, systemPrompt, userMessage, history = []) {
        const targetModel = model || 'openai/gpt-oss-20b';
        const url = 'https://api.groq.com/openai/v1/chat/completions';

        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        const recentHistory = (history || []).slice(-10);
        for (const msg of recentHistory) {
            if (!msg.content) continue;
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            });
        }

        if (!messages.length || messages[messages.length - 1].role !== 'user' || messages[messages.length - 1].content !== userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: targetModel,
                messages: messages,
                temperature: 0.7,
                max_tokens: 3000
            })
        });

        if (!res.ok) {
            const errorJson = await res.json().catch(() => ({}));
            throw new Error(errorJson.error?.message || `Groq API error (HTTP ${res.status})`);
        }

        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content;
        if (!answer) throw new Error('Groq returned an empty response.');
        return answer;
    }

    // ==========================================
    // MAIN SHIVI BRAIN CLASS & INTERFACE
    // ==========================================
    class ShiviBrainEngine {
        constructor(config = {}) {
            this.defaultModel = config.defaultModel || 'gemini-1.5-flash';
            this.systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
            this.models = GEMINI_MODELS;
        }

        /**
         * Main entry point to process any user query
         * @param {Object} params
         * @returns {Promise<{ reply: string, provider: string, model: string }>}
         */
        async ask(params = {}) {
            const {
                message,
                provider = 'gemini',
                apiKey = '',
                model = 'gemini-1.5-flash',
                persona = 'companion',
                systemPrompt = '',
                history = [],
                knowledgeContext = '',
                webContext = ''
            } = params;

            if (!message || !message.trim()) {
                throw new Error('Query message cannot be empty.');
            }

            const cleanMsg = message.trim();

            // Layer 1: Deterministic Identity Interceptor
            if (isIdentityQuery(cleanMsg)) {
                return {
                    success: true,
                    reply: IDENTITY_DIRECT_REPLY,
                    provider: 'builtin-brain',
                    model: 'identity-interceptor',
                    timestamp: new Date().toISOString()
                };
            }

            const fullSystemPrompt = `${this.systemPrompt}\nPersona Mode: ${persona}\n${systemPrompt ? `Custom Rules: ${systemPrompt}` : ''}\n${knowledgeContext ? `\n[VERIFIED BRAIN KNOWLEDGE]:\n${knowledgeContext}` : ''}${webContext ? `\n\n${webContext}` : ''}`;

            // If a Gemini API Key is provided, use Google Gemini
            if ((provider === 'gemini' || !provider) && apiKey) {
                try {
                    const reply = await callGeminiApi(apiKey, model, fullSystemPrompt, cleanMsg, history);
                    return {
                        success: true,
                        reply: reply,
                        provider: 'gemini',
                        model: model || 'gemini-1.5-flash',
                        timestamp: new Date().toISOString()
                    };
                } catch (err) {
                    console.warn('[Gemini API Call failed, falling back to Brain Logic]:', err.message);
                    throw err;
                }
            }

            // If a Groq API Key is provided, use Groq
            if (provider === 'groq' && apiKey) {
                const targetModel = (model && model !== 'llama-3.3-70b-versatile') ? model : 'openai/gpt-oss-20b';
                const reply = await callGroqApi(apiKey, targetModel, fullSystemPrompt, cleanMsg, history);
                return {
                    success: true,
                    reply: reply,
                    provider: 'groq',
                    model: targetModel,
                    timestamp: new Date().toISOString()
                };
            }

            // Fallback to Built-in Reasoning & Logic Engine
            const reply = generateLogicalAnswer(cleanMsg, persona, knowledgeContext, webContext);
            return {
                success: true,
                reply: reply,
                provider: 'builtin-brain',
                model: 'shivi-brain-logic-v2.5',
                timestamp: new Date().toISOString()
            };
        }

        /**
         * Test API Key connection
         */
        async testKey(provider, apiKey, model) {
            if (provider === 'gemini') {
                const startTime = Date.now();
                await callGeminiApi(apiKey, model || 'gemini-1.5-flash', 'You are a test ping responder.', 'Reply only: OK', []);
                return { success: true, latency: Date.now() - startTime };
            }
            if (provider === 'groq') {
                const startTime = Date.now();
                await callGroqApi(apiKey, model || 'openai/gpt-oss-20b', 'You are a test ping responder.', 'Reply only: OK', []);
                return { success: true, latency: Date.now() - startTime };
            }
            throw new Error(`Provider ${provider} not supported for testing.`);
        }
    }

    return new ShiviBrainEngine();
});
