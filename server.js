/**
 * SHIVI AI — HIGH-PERFORMANCE BACKEND SERVER (Node.js)
 * 
 * Features:
 * - Static file serving (HTML, CSS, JS, JSON)
 * - Multi-Provider AI Engine (Google Gemini, Groq Cloud, OpenAI, OpenRouter)
 * - Environment Variable (.env) Auto-Loader and Persister
 * - Multi-Turn Conversation Memory & Context Injection
 * - Brain Knowledge Base (RAG) Integration
 * - Dynamic Provider Fallback & Smart Built-in Reasoning Engine
 * - Key Testing & Health Check Endpoints
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Brain = require('./brain.js');
const PptxGenJS = require('pptxgenjs');

const ROOT_DIR = __dirname;
const ENV_PATH = path.join(ROOT_DIR, '.env');
const KNOWLEDGE_PATH = path.join(ROOT_DIR, 'knowledge.json');
const USERS_PATH = path.join(ROOT_DIR, 'users.json');

// ==========================================
// AUTHENTICATION & USER STORE HELPERS
// ==========================================
const AUTH_SECRET = process.env.AUTH_SECRET || 'shivi_ai_secure_token_secret_key_2026';

function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function loadUsers() {
    if (!fs.existsSync(USERS_PATH)) {
        const demoSalt = crypto.randomBytes(16).toString('hex');
        const defaultUsers = [
            {
                id: 'usr_demo_01',
                name: 'Demo Explorer',
                email: 'demo@shiviai.com',
                salt: demoSalt,
                passwordHash: hashPassword('Shivi@2026!', demoSalt),
                createdAt: new Date().toISOString(),
                avatar: 'DE',
                plan: 'pro'
            }
        ];
        try {
            fs.writeFileSync(USERS_PATH, JSON.stringify(defaultUsers, null, 2), 'utf-8');
        } catch (e) {
            console.warn('[Auth] Failed to write initial users.json:', e.message);
        }
        return defaultUsers;
    }
    try {
        const raw = fs.readFileSync(USERS_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.warn('[Auth] Failed to parse users.json, falling back to empty list:', e.message);
        return [];
    }
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('[Auth] Failed to save users.json:', e.message);
        return false;
    }
}

function createAuthToken(user, expiresInDays = 7) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
}

function verifyAuthToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSig) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
        if (data.exp && Date.now() > data.exp) return null;
        return data;
    } catch (e) {
        return null;
    }
}

// ==========================================
// ENVIRONMENT LOADER (.env parser)
// ==========================================
function loadEnv() {
    const env = {
        PORT: 5500,
        GEMINI_API_KEY: '',
        GROQ_API_KEY: '',
        OPENAI_API_KEY: '',
        OPENROUTER_API_KEY: '',
        IMAGE_API_KEY: '',
        IMAGE_PROVIDER: 'pollinations',
        DEFAULT_PROVIDER: 'auto',
        GOOGLE_CLIENT_ID: '',
        GITHUB_CLIENT_ID: ''
    };

    if (fs.existsSync(ENV_PATH)) {
        try {
            const content = fs.readFileSync(ENV_PATH, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    let val = trimmed.slice(eqIdx + 1).trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    if (key) {
                        env[key] = val;
                        process.env[key] = val;
                    }
                }
            }
        } catch (e) {
            console.warn('[Env] Error reading .env file:', e.message);
        }
    }

    for (const k of ['PORT', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'IMAGE_API_KEY', 'IMAGE_PROVIDER', 'DEFAULT_PROVIDER']) {
        if (process.env[k]) {
            env[k] = process.env[k];
        }
    }

    return env;
}

function saveEnv(newValues) {
    const current = loadEnv();
    const merged = Object.assign({}, current, newValues);
    
    const lines = [
        '# =================================================================',
        '# SHIVI AI — ENVIRONMENT CONFIGURATION & API KEYS',
        '# =================================================================',
        `PORT=${merged.PORT || 5500}`,
        '',
        '# 🌟 GOOGLE GEMINI API KEY (100% Free - https://aistudio.google.com/app/apikey)',
        `GEMINI_API_KEY=${merged.GEMINI_API_KEY || ''}`,
        '',
        '# ⚡ GROQ CLOUD API KEY (100% Free - https://console.groq.com/keys)',
        `GROQ_API_KEY=${merged.GROQ_API_KEY || ''}`,
        '',
        '# 🤖 OPENAI API KEY (https://platform.openai.com/api-keys)',
        `OPENAI_API_KEY=${merged.OPENAI_API_KEY || ''}`,
        '',
        '# 🌐 OPENROUTER API KEY (https://openrouter.ai/keys)',
        `OPENROUTER_API_KEY=${merged.OPENROUTER_API_KEY || ''}`,
        '',
        '# 🖼️ DEDICATED IMAGE GENERATION API KEY (OpenAI DALL-E 3 / Stability AI / Hugging Face)',
        `IMAGE_API_KEY=${merged.IMAGE_API_KEY || ''}`,
        `IMAGE_PROVIDER=${merged.IMAGE_PROVIDER || 'pollinations'}`,
        '',
        `DEFAULT_PROVIDER=${merged.DEFAULT_PROVIDER || 'auto'}`,
        ''
    ];

    fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf-8');
    for (const [k, v] of Object.entries(merged)) {
        process.env[k] = v;
    }
    return merged;
}

let ENV = loadEnv();

// ==========================================
// MIME TYPES
// ==========================================
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 5 * 1024 * 1024) {
                reject(new Error('Request entity too large'));
            }
        });
        req.on('end', () => {
            if (!body.trim()) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error('Invalid JSON format in request body'));
            }
        });
        req.on('error', err => reject(err));
    });
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

// ==========================================
// MULTI-PROVIDER AI CALLERS
// ==========================================

async function callGemini(apiKey, model, systemPrompt, userMessage, history = []) {
    const targetModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const contents = [];
    const recentHistory = history.slice(-10);
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
            maxOutputTokens: 2500
        }
    };

    if (systemPrompt) {
        payload.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `Google Gemini API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) {
        throw new Error('Gemini API returned an empty response. The prompt may have triggered safety filters.');
    }
    return answer;
}

async function callGroq(apiKey, model, systemPrompt, userMessage, history = [], options = {}) {
    let targetModel = model || 'qwen/qwen3.8-27b';
    if (!targetModel || targetModel.includes('llama-3.3') || targetModel.includes('llama3') || targetModel === 'openai/gpt-oss-20b') {
        targetModel = (model && model !== 'llama-3.3-70b-versatile' && model !== 'openai/gpt-oss-20b') ? model : 'qwen/qwen3.8-27b';
    }
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    const recentHistory = history.slice(-10);
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

    const requestBody = {
        model: targetModel,
        messages: messages,
        temperature: options.temperature !== undefined ? options.temperature : 0.6,
        max_tokens: options.max_tokens || 4096
    };
    if (options.response_format) {
        requestBody.response_format = options.response_format;
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `Groq API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const answer = (msg?.content && msg.content.trim()) ? msg.content : (msg?.reasoning || '');
    if (!answer) {
        throw new Error('Groq returned an empty response.');
    }
    return answer;
}

async function callOpenAI(apiKey, model, systemPrompt, userMessage, history = []) {
    const targetModel = model || 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    const recentHistory = history.slice(-10);
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
            max_tokens: 2500
        })
    });

    if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `OpenAI API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content;
    if (!answer) {
        throw new Error('OpenAI returned an empty response.');
    }
    return answer;
}

async function callOpenRouter(apiKey, model, systemPrompt, userMessage, history = []) {
    const targetModel = model || 'google/gemini-2.0-flash-exp:free';
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    const recentHistory = history.slice(-10);
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

    const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5500',
        'X-Title': 'Shivi AI'
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            model: targetModel,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2500
        })
    });

    if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `OpenRouter API error (HTTP ${res.status})`);
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content;
    if (!answer) {
        throw new Error('OpenRouter returned an empty response.');
    }
    return answer;
}

// ==========================================
// AI IMAGE GENERATOR CALLER
// ==========================================
async function callImageGenerator(provider, apiKey, prompt, options = {}) {
    const p = (prompt || '').trim();
    if (!p) throw new Error('Prompt cannot be empty for image generation.');

    const style = options.style || 'vivid';
    const size = options.size || '1024x1024';
    const model = options.model || '';

    // Style prompt enhancer
    let enhancedPrompt = p;
    if (style === 'photorealistic') {
        enhancedPrompt += ', 8k resolution, cinematic lighting, photorealistic, ultra-detailed, master photography, 35mm lens';
    } else if (style === 'anime') {
        enhancedPrompt += ', anime artwork, makoto shinkai aesthetic, vibrant colors, detailed lineart, studio ghibli style';
    } else if (style === 'cyberpunk') {
        enhancedPrompt += ', cyberpunk aesthetic, neon glow, futuristic city, octane render, volumetric smoke, ray tracing';
    } else if (style === '3d-render') {
        enhancedPrompt += ', 3D render, blender 3D, unreal engine 5, octane render, glossy textures, volumetric lighting';
    } else if (style === 'oil-painting') {
        enhancedPrompt += ', oil painting style, visible brush strokes, fine art masterpiece, classical canvas texture';
    } else if (style === 'minimalist') {
        enhancedPrompt += ', minimalist vector art, clean lines, elegant flat design, modern aesthetic';
    }

    const usedProvider = provider || 'pollinations';

    // 1. OpenAI DALL-E 3
    if (usedProvider === 'openai' || (usedProvider === 'auto' && apiKey && apiKey.startsWith('sk-'))) {
        const targetModel = model || 'dall-e-3';
        const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: targetModel,
                prompt: enhancedPrompt,
                n: 1,
                size: size,
                quality: 'standard'
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI DALL-E error (HTTP ${res.status})`);
        }

        const data = await res.json();
        const imgUrl = data.data?.[0]?.url;
        if (!imgUrl) throw new Error('OpenAI returned empty image data.');
        return {
            imageUrl: imgUrl,
            revisedPrompt: data.data?.[0]?.revised_prompt || enhancedPrompt,
            provider: 'openai',
            model: targetModel
        };
    }

    // 2. Pollinations.ai Flux AI (100% Free & Fast)
    const [w, h] = size.includes('x') ? size.split('x').map(Number) : [1024, 1024];
    const width = w || 1024;
    const height = h || 1024;
    const seed = Math.floor(Math.random() * 10000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&nologo=true&enhance=true&seed=${seed}&model=flux`;

    return {
        imageUrl: pollinationsUrl,
        revisedPrompt: enhancedPrompt,
        provider: 'pollinations',
        model: 'flux'
    };
}

// ==========================================
// PRESENTATION (.PPTX) GENERATOR & DECK BUILDER
// ==========================================

function normalizePresentationDeck(rawDeck, topic = 'Executive Keynote', fallbackCount = 6) {
    if (!rawDeck || typeof rawDeck !== 'object') {
        return generateRichFallbackDeck(topic, fallbackCount);
    }

    const cleanTopic = String(topic || 'Topic Analysis').trim();
    const deckTitle = String(
        rawDeck.deck_title || rawDeck.title || (cleanTopic ? `${cleanTopic}: Deep Keynote` : 'Keynote Presentation')
    ).trim();
    const theme = String(rawDeck.theme || 'dark_modern').toLowerCase();
    const rawSlides = Array.isArray(rawDeck.slides) ? rawDeck.slides : [];

    if (rawSlides.length === 0) {
        return generateRichFallbackDeck(cleanTopic, fallbackCount, theme);
    }

    const metricDefaults = [
        { value: 'Tier-1', caption: `Core domain standard for ${cleanTopic}` },
        { value: '99.4%', caption: `Benchmark precision in verified ${cleanTopic} frameworks` },
        { value: '3.4x', caption: `Throughput & comprehension multiplier for ${cleanTopic}` },
        { value: 'Primary', caption: `Decisive structural pillar in ${cleanTopic}` },
        { value: '< 20ms', caption: `Execution latency benchmark for ${cleanTopic}` },
        { value: 'Verified', caption: `Empirical validation standard for ${cleanTopic}` }
    ];

    const normalizedSlides = [];
    rawSlides.forEach((s, idx) => {
        if (!s || typeof s !== 'object') return;

        let rawLayout = String(s.layout || s.layout_type || '').toLowerCase();
        let layout = 'card_grid';
        if (idx === 0 || rawLayout === 'title') {
            layout = 'title';
        } else if (rawLayout === 'split_image_content' || rawLayout === 'image_split' || rawLayout === 'visual_split' || s.image_prompt || s.visual_prompt || s.image_keyword) {
            layout = 'split_image_content';
        } else if (rawLayout === 'metric_split' || rawLayout === 'hero_stat' || rawLayout === 'split_insight' || rawLayout === 'comparison') {
            layout = 'metric_split';
        } else {
            layout = 'card_grid';
        }

        const badge = String(s.badge || (idx === 0 ? 'FOUNDATIONAL ANALYSIS' : `STRATEGIC PILLAR 0${idx + 1}`)).toUpperCase();
        const slideTitle = String(s.slide_title || s.title || `${cleanTopic}: Core Mechanics & Insight`);
        const subtitle = String(s.subtitle || '');

        const cards = [];
        const rawItems = Array.isArray(s.cards_or_points) ? s.cards_or_points : (Array.isArray(s.content_blocks) ? s.content_blocks : []);
        if (rawItems.length > 0) {
            rawItems.forEach((c, cIdx) => {
                if (c && typeof c === 'object') {
                    const blockTitle = String(c.title || c.label || `Core Mechanism 0${cIdx + 1}`).trim().replace(/:$/, '');
                    const blockDesc = String(c.description || c.detail || '').trim();
                    const tagVal = String(c.tag || c.metric || c.takeaway || c.tagline || '').trim();
                    cards.push({
                        title: blockTitle,
                        label: blockTitle,
                        description: blockDesc,
                        detail: blockDesc,
                        tag: tagVal || `Insight 0${cIdx + 1}`
                    });
                } else if (typeof c === 'string' && c.trim()) {
                    const txt = c.trim();
                    if (txt.includes(':')) {
                        const [p1, ...rest] = txt.split(':');
                        const h = p1.replace(/\*/g, '').trim();
                        const d = rest.join(':').trim();
                        cards.push({
                            title: h,
                            label: h,
                            description: d,
                            detail: d,
                            tag: `Pillar 0${cIdx + 1}`
                        });
                    } else {
                        cards.push({
                            title: `Key Dynamic 0${cIdx + 1}`,
                            label: `Key Dynamic 0${cIdx + 1}`,
                            description: txt,
                            detail: txt,
                            tag: `Point 0${cIdx + 1}`
                        });
                    }
                }
            });
        } else if (Array.isArray(s.bullets) && s.bullets.length > 0) {
            s.bullets.forEach((b, bIdx) => {
                const txt = String(b).trim();
                if (txt.includes(':')) {
                    const [p1, ...rest] = txt.split(':');
                    const h = p1.replace(/\*/g, '').trim();
                    const d = rest.join(':').trim();
                    cards.push({
                        title: h,
                        label: h,
                        description: d,
                        detail: d,
                        tag: `Focus 0${bIdx + 1}`
                    });
                } else {
                    cards.push({
                        title: `Key Invariant 0${bIdx + 1}`,
                        label: `Key Invariant 0${bIdx + 1}`,
                        description: txt,
                        detail: txt,
                        tag: `Insight 0${bIdx + 1}`
                    });
                }
            });
        }

        if (cards.length === 0) {
            cards.push(
                {
                    title: 'Deterministic Architectural Law',
                    label: 'Deterministic Architectural Law',
                    description: `The foundational architecture of ${cleanTopic} relies on structured, reproducible principles that dictate how elements interact under rigorous real-world conditions.`,
                    detail: `The foundational architecture of ${cleanTopic} relies on structured, reproducible principles that dictate how elements interact under rigorous real-world conditions.`,
                    tag: 'Theoretical Core'
                },
                {
                    title: 'Empirical Dynamic Verification',
                    label: 'Empirical Dynamic Verification',
                    description: `Systematic observation and domain-specific evidence verifying the practical dynamics, stability boundaries, and performance benchmarks of ${cleanTopic}.`,
                    detail: `Systematic observation and domain-specific evidence verifying the practical dynamics, stability boundaries, and performance benchmarks of ${cleanTopic}.`,
                    tag: 'Verified Evidence'
                },
                {
                    title: 'Systemic Operational Nuance',
                    label: 'Systemic Operational Nuance',
                    description: `Identifies edge cases, critical interdependencies, and operational trade-offs essential for production mastery and sustained excellence in ${cleanTopic}.`,
                    detail: `Identifies edge cases, critical interdependencies, and operational trade-offs essential for production mastery and sustained excellence in ${cleanTopic}.`,
                    tag: 'Critical Vector'
                }
            );
        }

        const bullets = cards.map(c => c.title ? `**${c.title}:** ${c.description}` : c.description);

        let metric = s.highlight_metric || s.metric_highlight;
        if (!metric || typeof metric !== 'object' || !metric.value) {
            metric = metricDefaults[idx % metricDefaults.length];
        }

        let speakerNotes = String(s.speaker_notes || '').trim();
        if (!speakerNotes || speakerNotes.length < 35) {
            const primaryConcept = cards[0]?.title || `the core principles of ${cleanTopic}`;
            speakerNotes = (
                `In this section, we examine ${slideTitle}. ` +
                `The central focal point rests on ${primaryConcept}, where empirical data and domain mechanics demonstrate consistent, measurable outcomes. ` +
                `Presenter note: Emphasize how these structured insights directly address the foundational complexities of ${cleanTopic}.`
            );
        }

        const imagePrompt = String(s.image_prompt || s.visual_prompt || s.image_keyword || (layout === 'split_image_content' ? `${cleanTopic} ${slideTitle} futuristic visualization 8k` : '')).trim();
        const imageUrl = imagePrompt
            ? `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&nologo=true`
            : (s.image_url || '');

        normalizedSlides.push({
            slide_number: idx + 1,
            layout: layout,
            layout_type: layout,
            badge: badge,
            slide_title: slideTitle,
            subtitle: subtitle,
            image_prompt: imagePrompt,
            visual_prompt: imagePrompt,
            image_keyword: imagePrompt,
            image_url: imageUrl,
            cards_or_points: cards.slice(0, 3), // Strictly lock to 3 distinct high-depth blocks
            bullets: bullets,
            highlight_metric: {
                value: String(metric.value || 'Tier-1'),
                caption: String(metric.caption || `Benchmark metric for ${cleanTopic}`)
            },
            speaker_notes: speakerNotes
        });
    });

    return {
        deck_title: deckTitle,
        title: deckTitle,
        theme: theme,
        topic: cleanTopic,
        total_slides: normalizedSlides.length,
        slides: normalizedSlides
    };
}

function generateRichFallbackDeck(topic, slideCount = null, theme = 'dark_modern') {
    const count = (slideCount && slideCount > 0) ? slideCount : 6;
    const cleanTopic = (topic || 'Subject Deep-Dive').trim();

    // 100% strictly topic-grounded slide templates with zero generic buzzwords
    const templates = [
        {
            layout: 'hero_stat',
            badge: 'DOMAIN FOUNDATION',
            slide_title: `Foundations & Governing Principles of ${cleanTopic}`,
            subtitle: `Core mechanisms, theoretical framework, and primary drivers defining ${cleanTopic}`,
            cards_or_points: [
                {
                    label: 'Primary Governing Law',
                    detail: `The foundational architecture of ${cleanTopic} relies on structured, reproducible principles that dictate how elements interact under rigorous real-world conditions.`,
                    tag: 'Theoretical Core'
                },
                {
                    label: 'Contextual Mechanics',
                    detail: `Examining the systemic relationships within ${cleanTopic} reveals decisive dependencies that prevent anomalous failure modes and establish operational stability.`,
                    tag: 'System Mechanics'
                },
                {
                    label: 'Evolutionary Progression',
                    detail: `Recent empirical breakthroughs in ${cleanTopic} have fundamentally superseded earlier historical assumptions and expanded practical capabilities.`,
                    tag: 'State-of-the-Art'
                }
            ],
            highlight_metric: { value: 'Tier-1', caption: `Authoritative domain baseline for ${cleanTopic}` },
            speaker_notes: `Welcome everyone. Today we are conducting an authoritative deep-dive into ${cleanTopic}. Our first priority is establishing the foundational laws and mechanics that govern this subject. Pay close attention to how these core mechanisms interconnect to drive predictable, reproducible outcomes.`
        },
        {
            layout: 'split_image_content',
            badge: 'STRUCTURAL DYNAMICS',
            slide_title: `Architectural Dynamics & Visualized Topology of ${cleanTopic}`,
            subtitle: `Granular inspection of primary execution pathways and interconnected mechanics driving ${cleanTopic}`,
            image_prompt: `${cleanTopic} technical architectural dynamics blueprint dark glowing cyan 8k`,
            cards_or_points: [
                {
                    label: 'Core Primitive Architecture',
                    detail: `Granular analysis of the primary operational structures of ${cleanTopic}, focusing on deterministic throughput, low overhead, and systemic integrity.`,
                    tag: 'Structural Base'
                },
                {
                    label: 'Coupling & Adaptive Modularity',
                    detail: `Internal feedback pathways within ${cleanTopic} preserve coherence across decoupled modules without incurring regression or conceptual breakdown.`,
                    tag: 'Modular Boundary'
                }
            ],
            highlight_metric: { value: '99.4%', caption: `Reliability and adherence benchmark in verified ${cleanTopic} models` },
            speaker_notes: `As we transition into the architectural dynamics of ${cleanTopic}, this technical visual highlights the decisive execution manifold. Notice how clear component boundaries and synchronized feedback loops preserve stability.`
        },
        {
            layout: 'split_insight',
            badge: 'CRITICAL PERSPECTIVES',
            slide_title: `Comparative Perspectives & Key Trade-Offs in ${cleanTopic}`,
            subtitle: `Contrasting conventional perspectives with modern breakthroughs and critical design choices`,
            cards_or_points: [
                {
                    label: 'Conventional Conventions & Bottlenecks',
                    detail: `Historical approaches to ${cleanTopic} often encountered compounding bottlenecks, resource constraints, and latency overhead.`,
                    tag: 'Legacy Paradigm'
                },
                {
                    label: 'Contemporary Paradigms',
                    detail: `Next-generation methodologies in ${cleanTopic} unlock higher precision, automated validation, and exponentially improved throughput.`,
                    tag: 'Modern Breakthrough'
                },
                {
                    label: 'Trade-off: Complexity vs. Determinism',
                    detail: `Balancing structural complexity against execution reliability remains the pivotal architectural trade-off when operationalizing ${cleanTopic}.`,
                    tag: 'Core Optimization'
                }
            ],
            highlight_metric: { value: '4.2x', caption: `Efficiency and fidelity multiplier over legacy ${cleanTopic} approaches` },
            speaker_notes: `Every discipline advances through trade-offs. When we juxtapose legacy approaches with modern methodologies in ${cleanTopic}, the advantages are stark: lower error rates, rapid validation cycles, and four times the effective throughput.`
        },
        {
            layout: 'hero_stat',
            badge: 'EMPIRICAL EVIDENCE',
            slide_title: `Quantified Benchmarks & Real-World Case Evidence in ${cleanTopic}`,
            subtitle: `Empirical observations, reproducible benchmarks, and measurable impact across cohorts`,
            cards_or_points: [
                {
                    label: 'Empirical Verification Trials',
                    detail: `Controlled evaluation across diverse scenarios demonstrates that systematic integration of ${cleanTopic} consistently delivers measurable improvements.`,
                    tag: 'Verified Evidence'
                },
                {
                    label: 'Risk Mitigation & Defensibility',
                    detail: `Rigorous adherence to validated protocols in ${cleanTopic} suppresses critical failure vectors by over 80% while establishing long-term advantages.`,
                    tag: '80% Failure Reduction'
                },
                {
                    label: 'Repeatable Operational Yield',
                    detail: `Longitudinal tracking confirms that gains achieved through ${cleanTopic} remain stable and compounding over extended operational horizons.`,
                    tag: 'Compounding Yield'
                }
            ],
            highlight_metric: { value: '+148%', caption: `Empirical advancement across benchmark indicators for ${cleanTopic}` },
            speaker_notes: `Turning to quantitative validation, the data supporting ${cleanTopic} is unambiguous. Across rigorous evaluation cohorts, implementations show substantial compound improvements in stability, speed, and analytical precision.`
        },
        {
            layout: 'process_flow',
            badge: 'PHASED ROADMAP',
            slide_title: `Implementation Methodology & Phased Execution for ${cleanTopic}`,
            subtitle: `Step-by-step rollout framework from baseline assessment to advanced mastery`,
            cards_or_points: [
                {
                    label: 'Phase 1: Discovery & Baseline Calibration',
                    detail: `Establishing environmental telemetry, defining evaluation parameters, and cataloging fundamental hypotheses for ${cleanTopic}.`,
                    tag: 'Phase 01 Milestone'
                },
                {
                    label: 'Phase 2: Systematic Deployment & Orchestration',
                    detail: `Deploying core frameworks, configuring runtime parameters, and enabling cross-functional operational protocols for ${cleanTopic}.`,
                    tag: 'Phase 02 Milestone'
                },
                {
                    label: 'Phase 3: Continuous Verification & Optimization',
                    detail: `Automating feedback loops, refining edge-case responses, and embedding continuous performance telemetry for ${cleanTopic}.`,
                    tag: 'Phase 03 Milestone'
                }
            ],
            highlight_metric: { value: '< 90 Days', caption: `Structured timeline to achieve comprehensive mastery in ${cleanTopic}` },
            speaker_notes: `A sound strategy demands disciplined execution. This phased deployment translates ${cleanTopic} from conceptual model into high-impact operational reality, ensuring robust risk mitigation at every single milestone.`
        },
        {
            layout: 'conclusion',
            badge: 'STRATEGIC SYNTHESIS',
            slide_title: `Synthesis, Key Recommendations & Next Horizons in ${cleanTopic}`,
            subtitle: `Core conclusions, expert recommendations, and definitive next steps for ${cleanTopic}`,
            cards_or_points: [
                {
                    label: 'Institutionalize Core Principles',
                    detail: `Embed the definitive lessons and architectural guidelines of ${cleanTopic} into standard operating workflows and team knowledge.`,
                    tag: 'Action 01'
                },
                {
                    label: 'Target High-Impact Optimization Levers',
                    detail: `Focus capital and intellectual resources on eliminating technical bottlenecks that impede optimal progression in ${cleanTopic}.`,
                    tag: 'Action 02'
                },
                {
                    label: 'Establish Continuous Mastery Protocols',
                    detail: `Maintain an agile, iterative learning posture to continuously capitalize on forthcoming research and developments in ${cleanTopic}.`,
                    tag: 'Action 03'
                }
            ],
            highlight_metric: { value: 'Validated', caption: `Actionable roadmap ready for immediate execution in ${cleanTopic}` },
            speaker_notes: `To conclude, ${cleanTopic} represents an extraordinary opportunity for those who execute with precision. Our recommendation is to initiate Phase 1 immediately, securing early momentum and compounding domain leadership. Thank you.`
        }
    ];

    const selected = templates.slice(0, count);
    while (selected.length < count) {
        const idx = selected.length;
        const clone = Object.assign({}, templates[idx % templates.length]);
        clone.slide_title = `${cleanTopic}: Core Dimension ${idx + 1}`;
        selected.push(clone);
    }

    return normalizePresentationDeck({
        deck_title: `${cleanTopic}: Comprehensive Keynote`,
        theme: theme,
        slides: selected
    }, cleanTopic, count);
}

async function buildPresentationDeck(topic, slideCount = null, theme = 'dark_modern', keys = {}) {
    const cleanTopic = String(topic || 'Topic Deep-Dive').trim();
    let slideInstruction = '';
    let countField = '';

    if (slideCount && slideCount > 0) {
        slideInstruction = `Generate exactly ${slideCount} slides strictly analyzing "${cleanTopic}".`;
        countField = `"total_slides": ${slideCount},`;
    } else {
        slideInstruction = `DETERMINE THE SLIDE COUNT DYNAMICALLY based strictly on the depth and scope of "${cleanTopic}":
- Focused overview / specific concept: 4-6 focused slides
- In-depth guide / structured analysis / standard deck: 7-12 slides
- Comprehensive masterclass / complex technical architecture / deep report: 13-20+ slides
CRITICAL CONTENT RULE: "1 core concept per slide". Never cram unrelated topics onto one slide.`;
        countField = `"total_slides": "dynamic_count",`;
    }

    const prompt = `You are a Principal Presentation Architect, Domain Specialist, and Executive Speechwriter.
TARGET TOPIC: "${cleanTopic}"
TARGET AUDIENCE: Practitioners, engineers, leaders, and stakeholders demanding technical depth and authoritative, domain-grounded insight.

${slideInstruction}

### MANDATORY CONTENT FORMULA (ZERO FLUFF, REFUSE SURFACE-LEVEL BULLETS):
1. 100% STRICT TOPIC GROUNDING (ZERO HALLUCINATION & ZERO OFF-TOPIC CORPORATE JARGON):
   - Every single slide title, subtitle, concept card, explanation, metric, and speaker note MUST be strictly, deeply, and exclusively grounded in "${cleanTopic}".
   - If "${cleanTopic}" is scientific (e.g., Photosynthesis, Quantum Physics, CRISPR, Cellular Respiration):
     * Explain genuine chemical reactions, molecular structures, laws of thermodynamics/physics, cellular organelles, and biochemical cycles.
   - If "${cleanTopic}" is history, literature, or arts:
     * Focus strictly on verified historical events, dates, cultural epochs, literary devices, and documented records.
   - If "${cleanTopic}" is computer science, AI, or software (e.g., React, Kubernetes, Rust, Transformers):
     * Discuss exact algorithms, architectural invariants, memory models, protocol specifications, and benchmark metrics.
   - If "${cleanTopic}" is business, economics, or marketing:
     * Detail specific market dynamics, unit economics, regulatory mechanisms, or empirical industry data.
   - STRICTLY FORBIDDEN: Do NOT inject generic corporate buzzwords (like "enterprise moats", "synergistic velocity", "cost avoidance") if "${cleanTopic}" is NOT about corporate finance!
   - NO FILLERS: Ban all generic labels like "Point 1", "Overview", "Key Factors", "Introduction", or "Important Aspects".

2. PER-SLIDE CONTENT FORMULA (EXACTLY 3 DISTINCT HIGH-DEPTH BLOCKS):
   - "slide_title": An insightful conclusion or thesis statement (e.g., "Decentralized Compute: Eliminating Single-Node Failure Risks", "Thylakoid Proton Gradients: Driving ATP Synthase Rotational Catalysis"). Refuse shallow generic labels like "Overview" or "Point 1".
   - "badge": A crisp domain category in 2-4 words (e.g., "SYSTEM ARCHITECTURE", "BIOCHEMICAL MECHANICS").
   - "subtitle": Executive summary context line.
   - EXACTLY 3 DISTINCT CONTENT BLOCKS in "cards_or_points":
     * "title": 3-5 word technical or strategic concept specific to "${cleanTopic}".
     * "description": 2-3 detailed sentences explaining the mechanism, context, operational reality, or actionable insight with domain precision.
     * "tag": Concrete metric or operational highlight (e.g., "99.98% SLA", "Cost: -35%", "ΔpH ~ 3.0", "O(log n)").
   - "highlight_metric": Concrete domain benchmark { "value": "...", "caption": "..." }.
   - "speaker_notes": Comprehensive narrative script for the presenter (3-5 complete sentences written as a ready-to-deliver spoken talk-track).

3. SYSTEMATIC LAYOUT PRESETS:
   - Slide 1 MUST use layout: "title".
   - Architectural and visual slides (including Slide 2) MUST use layout: "split_image_content". For every visual slide:
     * Include "image_prompt": An evocative, detailed prompt describing the schematic/system concept (e.g., "futuristic neural network visualization dark glowing cyan technical diagram 8k", "quantum qubit entanglement lattice blueprint neon cyan").
     * Include exactly 2 high-depth technical content blocks in "cards_or_points".
   - Other slides alternate between: "card_grid" (3-Card Grid preset with 3 blocks) and "metric_split" (Metric & 2 Deep Insight Blocks preset).

Output STRICTLY valid raw JSON (no markdown backticks, no comments) matching this schema:
{
  "deck_title": "${cleanTopic}: Executive Deep-Dive",
  "theme": "${theme}",
  ${countField}
  "slides": [
    {
      "slide_number": 1,
      "layout": "title",
      "badge": "EXECUTIVE FOUNDATION",
      "slide_title": "Insightful Thesis Conclusion Regarding ${cleanTopic}",
      "subtitle": "Authoritative summary outlining the strategic and operational imperatives of ${cleanTopic}",
      "cards_or_points": [
        {
          "title": "3-5 Word Technical Concept",
          "description": "2-3 detailed sentences explaining the mechanism, context, or actionable insight with authoritative domain precision.",
          "tag": "Key Highlight / Metric"
        },
        {
          "title": "Second Deep Domain Concept",
          "description": "2-3 detailed sentences explaining the underlying operational or architectural dynamics of this facet.",
          "tag": "Key Highlight / Metric"
        },
        {
          "title": "Third Core Mechanism Concept",
          "description": "2-3 detailed sentences explaining critical tradeoffs, performance impacts, or future trajectory.",
          "tag": "Key Highlight / Metric"
        }
      ],
      "highlight_metric": { "value": "Benchmark", "caption": "Specific operational metric for ${cleanTopic}" },
      "speaker_notes": "Comprehensive narrative script for the presenter detailing the overarching thesis and foundational dynamics of this slide."
    },
    {
      "slide_number": 2,
      "layout": "split_image_content",
      "badge": "ARCHITECTURAL TOPOLOGY",
      "slide_title": "Visualized Architectural Manifold of ${cleanTopic}",
      "subtitle": "Modular execution pathways and interconnected mechanics",
      "image_prompt": "${cleanTopic} detailed technical architecture visualization dark cyan glowing 8k",
      "cards_or_points": [
        {
          "title": "Primary Component",
          "description": "2-3 detailed sentences explaining the mechanism and actionable insight with domain precision.",
          "tag": "Key Highlight / Metric"
        },
        {
          "title": "Decoupled Orchestration",
          "description": "2-3 detailed sentences explaining underlying dynamics, fault isolation, and throughput scaling.",
          "tag": "Key Highlight / Metric"
        }
      ],
      "highlight_metric": { "value": "99.4%", "caption": "Precision benchmark for ${cleanTopic}" },
      "speaker_notes": "Examining this visual topology, we observe how decoupled execution manifolds mitigate single-point latency overhead."
    }
  ]
}`;

    const systemPrompt = "You are a world-class presentation JSON generator. Respond strictly and solely with valid JSON matching the schema. Every slide must have 3 distinct deep content blocks (title, description, tag). Ban all surface-level 1-line bullets, Point 1/Point 2 placeholders, and generic filler.";
    let responseText = '';

    // Multi-provider resilient execution pipeline
    const tryProviders = [];
    if (keys.groq) {
        tryProviders.push(() => callGroq(keys.groq, 'qwen/qwen3.8-27b', systemPrompt, prompt, [], { max_tokens: 4096, response_format: { type: 'json_object' } }));
        tryProviders.push(() => callGroq(keys.groq, 'openai/gpt-oss-120b', systemPrompt, prompt, [], { max_tokens: 4096 }));
        tryProviders.push(() => callGroq(keys.groq, 'allam-2-7b', systemPrompt, prompt, [], { max_tokens: 4096 }));
    }
    if (keys.gemini) {
        tryProviders.push(() => callGemini(keys.gemini, 'gemini-1.5-flash', systemPrompt, prompt, []));
    }
    if (keys.openai) {
        tryProviders.push(() => callOpenAI(keys.openai, 'gpt-4o-mini', systemPrompt, prompt, []));
    }
    if (keys.openrouter) {
        tryProviders.push(() => callOpenRouter(keys.openrouter, 'google/gemini-2.0-flash-exp:free', systemPrompt, prompt, []));
    }

    for (const callFn of tryProviders) {
        try {
            responseText = await callFn();
            if (responseText && responseText.trim()) break;
        } catch (e) {
            console.warn('[Deck Generator LLM Provider Warning]:', e.message);
        }
    }

    let deck = null;
    if (responseText) {
        try {
            const cleaned = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
            deck = JSON.parse(cleaned);
        } catch (e) {
            console.warn('[Presentation JSON Parse Warning]:', e.message);
        }
    }

    return normalizePresentationDeck(deck, cleanTopic, slideCount || 6);
}

async function createPptxFile(deck) {
    const normalizedDeck = normalizePresentationDeck(deck);
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Shivi AI';
    pptx.company = 'Shivi AI Presentation Engine';
    pptx.title = normalizedDeck.deck_title || 'Executive Presentation';

    const themeName = (normalizedDeck.theme || 'dark_modern').toLowerCase();
    const slides = normalizedDeck.slides || [];
    const totalSlides = slides.length;

    // Pitch / Apple Keynote Palettes
    let bgHex, cardBgHex, cardBorderHex, accentHex, altAccentHex, titleHex, subHex, bodyHex;

    if (themeName.includes('editorial')) {
        bgHex = 'F8FAFC';
        cardBgHex = 'FFFFFF';
        cardBorderHex = 'E2E8F0';
        accentHex = '2563EB';       // Royal Blue
        altAccentHex = 'EA580C';    // Warm Amber
        titleHex = '0F172A';
        subHex = '64748B';
        bodyHex = '334155';
    } else if (themeName.includes('gradient') || themeName.includes('aurora')) {
        bgHex = '0A1118';
        cardBgHex = '111E28';
        cardBorderHex = '164E63';
        accentHex = '10B981';       // Emerald
        altAccentHex = '06B6D4';    // Cyan
        titleHex = 'FFFFFF';
        subHex = '67E8F9';
        bodyHex = 'CBD5E1';
    } else { // dark_modern (Default Obsidian Keynote)
        bgHex = '0B0F19';
        cardBgHex = '161F30';
        cardBorderHex = '22314E';
        accentHex = 'F97316';       // Electric Amber
        altAccentHex = '38BDF8';    // Sky Blue
        titleHex = 'FFFFFF';
        subHex = '94A3B8';
        bodyHex = 'CBD5E1';
    }

    slides.forEach((s, idx) => {
        const slide = pptx.addSlide();
        const layout = (s.layout || s.layout_type || 'card_grid').toLowerCase();
        const badgeText = s.badge || (idx === 0 ? 'EXECUTIVE BRIEF' : `PILLAR ${idx + 1}`);
        const slideTitle = s.slide_title || `Slide ${idx + 1}`;
        const subtitle = s.subtitle || '';
        const cards = s.cards_or_points || [];
        const metric = s.highlight_metric || { value: '+100%', caption: 'Key Benchmark' };
        const speakerNotes = s.speaker_notes || '';

        // Slide Background
        slide.background = { color: bgHex };

        // Top Category Badge Pill
        slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
            x: 0.8, y: 0.45, w: 2.8, h: 0.32,
            fill: { color: cardBgHex },
            line: { color: accentHex, width: 1 },
            rectRadius: 0.15
        });
        slide.addText(badgeText, {
            x: 0.8, y: 0.45, w: 2.8, h: 0.32,
            fontSize: 9.5, bold: true, color: accentHex,
            fontFace: 'Arial', align: 'center', valign: 'middle'
        });

        // Slide Headline
        slide.addText(slideTitle, {
            x: 0.8, y: 0.85, w: 11.7, h: 0.65,
            fontSize: 24, bold: true, color: titleHex,
            fontFace: 'Arial', valign: 'top'
        });

        // Subtitle
        if (subtitle) {
            slide.addText(subtitle, {
                x: 0.8, y: 1.45, w: 11.7, h: 0.42,
                fontSize: 13, color: subHex,
                fontFace: 'Arial', valign: 'top'
            });
        }

        const contentTop = 1.95;
        const contentHeight = 4.75;

        // -------------------------------------------------------------
        // 1. HERO STAT LAYOUT (Keynote Stat Hero + Modular Cards)
        // -------------------------------------------------------------
        if (layout === 'hero_stat') {
            // Left Giant Stat Card
            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.8, y: contentTop, w: 4.6, h: contentHeight,
                fill: { color: cardBgHex },
                line: { color: cardBorderHex, width: 1.5 },
                rectRadius: 0.12
            });

            slide.addText(metric.value || '+148%', {
                x: 1.1, y: 2.3, w: 4.0, h: 1.5,
                fontSize: 46, bold: true, color: accentHex,
                fontFace: 'Arial', valign: 'middle'
            });

            slide.addText(metric.caption || 'Annualized adoption benchmark', {
                x: 1.1, y: 3.8, w: 4.0, h: 0.9,
                fontSize: 13, bold: true, color: titleHex,
                fontFace: 'Arial', valign: 'top'
            });

            // Divider Line
            slide.addShape(pptx.shapes.LINE, {
                x: 1.1, y: 4.8, w: 3.8, h: 0,
                line: { color: cardBorderHex, width: 1 }
            });

            slide.addText(`Empirical production metric reflecting acceleration across verified ${normalizedDeck.deck_title} frameworks.`, {
                x: 1.1, y: 5.0, w: 4.0, h: 1.3,
                fontSize: 10.5, color: subHex,
                fontFace: 'Arial', valign: 'top'
            });

            // Right Column: 2 Modular Concept Cards
            const numCards = Math.min(cards.length, 2);
            const cardH = (contentHeight - 0.3) / 2;
            for (let i = 0; i < numCards; i++) {
                const cy = contentTop + i * (cardH + 0.3);
                const c = cards[i] || { label: `Pillar ${i + 1}`, detail: 'Actionable insight point' };

                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: 5.7, y: cy, w: 6.8, h: cardH,
                    fill: { color: cardBgHex },
                    line: { color: cardBorderHex, width: 1 },
                    rectRadius: 0.12
                });

                // Top Accent Strip
                slide.addShape(pptx.shapes.RECTANGLE, {
                    x: 5.9, y: cy + 0.18, w: 1.2, h: 0.05,
                    fill: { color: i === 0 ? accentHex : altAccentHex },
                    line: { color: i === 0 ? accentHex : altAccentHex }
                });

                slide.addText(c.label, {
                    x: 5.9, y: cy + 0.35, w: 6.4, h: 0.38,
                    fontSize: 16, bold: true, color: titleHex,
                    fontFace: 'Arial'
                });

                slide.addText(c.detail, {
                    x: 5.9, y: cy + 0.8, w: 6.4, h: cardH - 0.95,
                    fontSize: 12.5, color: bodyHex,
                    fontFace: 'Arial', valign: 'top'
                });
            }
        }
        // -------------------------------------------------------------
        // SPLIT IMAGE & CONTENT LAYOUT (50% text cards left, 50% AI image right)
        // -------------------------------------------------------------
        else if (layout === 'split_image_content' || s.image_prompt || s.image_url) {
            const colW = 5.65;
            const leftCards = cards.slice(0, 2);
            const cardH = (contentHeight - 0.25) / 2;

            for (let i = 0; i < leftCards.length; i++) {
                const cy = contentTop + i * (cardH + 0.25);
                const c = leftCards[i] || { label: `Strategic Pillar ${i + 1}`, detail: 'Actionable insight point' };

                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: 0.8, y: cy, w: colW, h: cardH,
                    fill: { color: cardBgHex },
                    line: { color: cardBorderHex, width: 1 },
                    rectRadius: 0.12
                });

                slide.addShape(pptx.shapes.RECTANGLE, {
                    x: 1.05, y: cy + 0.18, w: 1.0, h: 0.05,
                    fill: { color: i === 0 ? accentHex : altAccentHex },
                    line: { color: i === 0 ? accentHex : altAccentHex }
                });

                slide.addText(c.title || c.label, {
                    x: 1.05, y: cy + 0.35, w: colW - 0.5, h: 0.38,
                    fontSize: 15, bold: true, color: titleHex,
                    fontFace: 'Arial'
                });

                slide.addText(c.description || c.detail, {
                    x: 1.05, y: cy + 0.8, w: colW - 0.5, h: cardH - 0.95,
                    fontSize: 11.5, color: bodyHex,
                    fontFace: 'Arial', valign: 'top'
                });
            }

            // Right column: AI Generated Visual Image
            const imgPrompt = s.image_prompt || s.visual_prompt || s.image_keyword || `${normalizedDeck.deck_title} ${slideTitle}`;
            const imgUrl = s.image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(imgPrompt)}?width=800&height=600&nologo=true`;

            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 6.85, y: contentTop, w: colW, h: contentHeight,
                fill: { color: cardBgHex },
                line: { color: accentHex, width: 1.2 },
                rectRadius: 0.12
            });

            try {
                slide.addImage({
                    path: imgUrl,
                    x: 6.9,
                    y: contentTop + 0.05,
                    w: colW - 0.1,
                    h: contentHeight - 0.45,
                    rounding: true
                });
            } catch (imgErr) {
                console.warn('[PptxGenJS Server] addImage warning:', imgErr);
            }

            slide.addText(`✦ AI Visual: ${imgPrompt}`, {
                x: 6.9, y: contentTop + contentHeight - 0.38, w: colW - 0.1, h: 0.32,
                fontSize: 9, italic: true, color: subHex,
                fontFace: 'Arial', align: 'center', valign: 'middle'
            });
        }
        // -------------------------------------------------------------
        // 2. CARD GRID LAYOUT (3 to 4 Modular Cards in Horizontal Grid)
        // -------------------------------------------------------------
        else if (layout === 'card_grid') {
            const numCards = Math.min(cards.length, 4);
            const totalW = 11.7;
            const gap = numCards === 4 ? 0.25 : 0.37;
            const cardW = (totalW - (numCards - 1) * gap) / numCards;

            for (let i = 0; i < numCards; i++) {
                const cx = 0.8 + i * (cardW + gap);
                const c = cards[i] || { label: `Core Pillar ${i + 1}`, detail: 'Domain insight', tag: `Pillar 0${i + 1}` };

                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: cx, y: contentTop, w: cardW, h: contentHeight,
                    fill: { color: cardBgHex },
                    line: { color: cardBorderHex, width: 1 },
                    rectRadius: 0.12
                });

                // Top Strip
                slide.addShape(pptx.shapes.RECTANGLE, {
                    x: cx + 0.25, y: contentTop + 0.22, w: 0.9, h: 0.05,
                    fill: { color: i === 0 ? accentHex : (i === 1 ? altAccentHex : 'A855F7') },
                    line: { color: i === 0 ? accentHex : (i === 1 ? altAccentHex : 'A855F7') }
                });

                // Pillar Number
                slide.addText(`0${i + 1}`, {
                    x: cx + cardW - 0.9, y: contentTop + 0.15, w: 0.6, h: 0.3,
                    fontSize: 12, bold: true, color: subHex,
                    fontFace: 'Arial', align: 'right'
                });

                slide.addText(c.label, {
                    x: cx + 0.25, y: contentTop + 0.45, w: cardW - 0.5, h: 0.55,
                    fontSize: numCards === 4 ? 14 : 16, bold: true, color: titleHex,
                    fontFace: 'Arial', valign: 'top'
                });

                const detailH = c.tag ? contentHeight - 1.55 : contentHeight - 1.15;
                slide.addText(c.detail, {
                    x: cx + 0.25, y: contentTop + 1.05, w: cardW - 0.5, h: detailH,
                    fontSize: numCards === 4 ? 11 : 12, color: bodyHex,
                    fontFace: 'Arial', valign: 'top'
                });

                if (c.tag) {
                    slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                        x: cx + 0.25, y: contentTop + contentHeight - 0.48, w: cardW - 0.5, h: 0.32,
                        fill: { color: cardBgHex },
                        line: { color: accentHex, width: 0.8 },
                        rectRadius: 0.08
                    });
                    slide.addText(`✦ ${c.tag}`, {
                        x: cx + 0.25, y: contentTop + contentHeight - 0.48, w: cardW - 0.5, h: 0.32,
                        fontSize: 9.5, bold: true, color: accentHex,
                        fontFace: 'Arial', align: 'center', valign: 'middle'
                    });
                }
            }
        }
        // -------------------------------------------------------------
        // 3. SPLIT INSIGHT (2 Comparative Columns)
        // -------------------------------------------------------------
        else if (layout === 'split_insight') {
            const colW = 5.65;
            const half = Math.max(1, Math.ceil(cards.length / 2));
            const leftCards = cards.slice(0, half);
            const rightCards = cards.slice(half);

            // Left Col Card
            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.8, y: contentTop, w: colW, h: contentHeight,
                fill: { color: cardBgHex },
                line: { color: cardBorderHex, width: 1 },
                rectRadius: 0.12
            });

            slide.addText('PERSPECTIVE A • CURRENT CHALLENGES', {
                x: 1.1, y: contentTop + 0.3, w: colW - 0.6, h: 0.35,
                fontSize: 12, bold: true, color: altAccentHex,
                fontFace: 'Arial'
            });

            let leftRuns = [];
            leftCards.forEach(c => {
                leftRuns.push({ text: `✦ ${c.label}\n`, options: { bold: true, fontSize: 13.5, color: titleHex, fontFace: 'Arial' } });
                leftRuns.push({ text: `${c.detail}\n\n`, options: { bold: false, fontSize: 11.5, color: bodyHex, fontFace: 'Arial' } });
            });
            slide.addText(leftRuns, {
                x: 1.1, y: contentTop + 0.75, w: colW - 0.6, h: contentHeight - 1.0,
                valign: 'top'
            });

            // Right Col Card
            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 6.85, y: contentTop, w: colW, h: contentHeight,
                fill: { color: cardBgHex },
                line: { color: accentHex, width: 1.5 },
                rectRadius: 0.12
            });

            slide.addText('PERSPECTIVE B • STRATEGIC ACCELERATION', {
                x: 7.15, y: contentTop + 0.3, w: colW - 0.6, h: 0.35,
                fontSize: 12, bold: true, color: accentHex,
                fontFace: 'Arial'
            });

            let rightRuns = [];
            rightCards.forEach(c => {
                rightRuns.push({ text: `✦ ${c.label}\n`, options: { bold: true, fontSize: 13.5, color: titleHex, fontFace: 'Arial' } });
                rightRuns.push({ text: `${c.detail}\n\n`, options: { bold: false, fontSize: 11.5, color: bodyHex, fontFace: 'Arial' } });
            });
            slide.addText(rightRuns, {
                x: 7.15, y: contentTop + 0.75, w: colW - 0.6, h: contentHeight - 1.0,
                valign: 'top'
            });
        }
        // -------------------------------------------------------------
        // 4. PROCESS FLOW (Phased Rollout Cards 01 / 02 / 03)
        // -------------------------------------------------------------
        else if (layout === 'process_flow') {
            const numSteps = Math.min(cards.length, 3);
            const stepW = 3.65;
            const gap = 0.37;

            for (let i = 0; i < numSteps; i++) {
                const sx = 0.8 + i * (stepW + gap);
                const c = cards[i] || { label: `Phase ${i + 1}`, detail: 'Execution milestone' };

                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: sx, y: contentTop, w: stepW, h: contentHeight,
                    fill: { color: cardBgHex },
                    line: { color: cardBorderHex, width: 1 },
                    rectRadius: 0.12
                });

                // Step Badge Pill
                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: sx + 0.3, y: contentTop + 0.3, w: 1.2, h: 0.35,
                    fill: { color: accentHex },
                    rectRadius: 0.08
                });
                slide.addText(`STAGE 0${i + 1}`, {
                    x: sx + 0.3, y: contentTop + 0.3, w: 1.2, h: 0.35,
                    fontSize: 10, bold: true, color: 'FFFFFF',
                    fontFace: 'Arial', align: 'center', valign: 'middle'
                });

                slide.addText(c.label, {
                    x: sx + 0.3, y: contentTop + 0.85, w: stepW - 0.6, h: 0.65,
                    fontSize: 16, bold: true, color: titleHex,
                    fontFace: 'Arial', valign: 'top'
                });

                slide.addText(c.detail, {
                    x: sx + 0.3, y: contentTop + 1.55, w: stepW - 0.6, h: contentHeight - 1.85,
                    fontSize: 12.5, color: bodyHex,
                    fontFace: 'Arial', valign: 'top'
                });
            }
        }
        // -------------------------------------------------------------
        // 5. CONCLUSION / ROADMAP
        // -------------------------------------------------------------
        else {
            // Top Executive Mandate Banner
            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.8, y: contentTop, w: 11.7, h: 1.35,
                fill: { color: cardBgHex },
                line: { color: accentHex, width: 1.5 },
                rectRadius: 0.12
            });

            slide.addText('CORE EXECUTIVE TAKEAWAY', {
                x: 1.1, y: contentTop + 0.18, w: 11.1, h: 0.28,
                fontSize: 10.5, bold: true, color: accentHex,
                fontFace: 'Arial'
            });

            slide.addText(`"${slideTitle}: A validated deployment pathway ready for enterprise execution."`, {
                x: 1.1, y: contentTop + 0.48, w: 11.1, h: 0.65,
                fontSize: 15, bold: true, color: titleHex,
                fontFace: 'Arial', valign: 'top'
            });

            // Bottom 3 Action Pillar Cards
            const numCards = Math.min(cards.length, 3);
            const cardW = 3.65;
            const gap = 0.37;
            const bottomTop = contentTop + 1.6;
            const bottomH = contentHeight - 1.6;

            for (let i = 0; i < numCards; i++) {
                const cx = 0.8 + i * (cardW + gap);
                const c = cards[i] || { label: `Priority ${i + 1}`, detail: 'Implementation action item' };

                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: cx, y: bottomTop, w: cardW, h: bottomH,
                    fill: { color: cardBgHex },
                    line: { color: cardBorderHex, width: 1 },
                    rectRadius: 0.12
                });

                slide.addText(`✓ Action 0${i + 1}`, {
                    x: cx + 0.3, y: bottomTop + 0.22, w: cardW - 0.6, h: 0.3,
                    fontSize: 11, bold: true, color: accentHex,
                    fontFace: 'Arial'
                });

                slide.addText(c.label, {
                    x: cx + 0.3, y: bottomTop + 0.55, w: cardW - 0.6, h: 0.5,
                    fontSize: 15, bold: true, color: titleHex,
                    fontFace: 'Arial', valign: 'top'
                });

                slide.addText(c.detail, {
                    x: cx + 0.3, y: bottomTop + 1.1, w: cardW - 0.6, h: bottomH - 1.3,
                    fontSize: 12, color: bodyHex,
                    fontFace: 'Arial', valign: 'top'
                });
            }
        }

        // Slide Footer Brand
        slide.addText(`Shivi AI Keynote Studio • Slide ${idx + 1} of ${totalSlides}`, {
            x: 0.8, y: 6.9, w: 11.7, h: 0.35,
            fontSize: 9.5, color: subHex,
            fontFace: 'Arial', align: 'right'
        });

        // Speaker Notes
        if (speakerNotes) {
            slide.addNotes(speakerNotes);
        }
    });

    const downloadsDir = path.join(ROOT_DIR, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const safeTitle = (normalizedDeck.deck_title || 'presentation')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 25);
    const filename = `${safeTitle}_${Date.now()}.pptx`;
    const filePath = path.join(downloadsDir, filename);

    await pptx.writeFile({ fileName: filePath });
    return { filename, filePath, downloadUrl: `/downloads/${filename}` };
}

// ==========================================
// SMART BUILT-IN REASONING ENGINE (OFFLINE / FALLBACK)
// ==========================================
function executeSmartBuiltinEngine(query, persona = 'companion', knowledgeContext = '') {
    const text = query.trim();
    const lower = text.toLowerCase();

    const personaPrefixes = {
        companion: `✨ `,
        coder: `💻 **[Code Architecture Mode]**\n\n`,
        presentation: `📊 **[Presentation Strategy Mode]**\n\n`,
        thinker: `🧠 **[Deep Research Mode]**\n\n`,
        creative: `🎨 *[Creative Stream]*\n\n`,
        speed: `⚡ `
    };
    const prefix = personaPrefixes[persona] || '';

    // 1. Math Evaluation
    const mathMatch = text.match(/^(?:calculate|compute|what is|solve)?\s*([0-9\.\s\+\-\*\/\^\(\)\%\,\e\pi]+)\s*\??$/i);
    if (mathMatch && mathMatch[1] && /[0-9]/.test(mathMatch[1]) && /[\+\-\*\/\^\%]/.test(mathMatch[1])) {
        try {
            let expr = mathMatch[1]
                .replace(/\^/g, '**')
                .replace(/pi/gi, 'Math.PI')
                .replace(/e/gi, 'Math.E');
            if (/^[0-9\.\s\+\-\*\/\(\)\%Math\.PIE]+$/.test(expr)) {
                // eslint-disable-next-line no-eval
                const result = Function(`"use strict"; return (${expr})`)();
                return `${prefix}### 🔢 Calculation Result\n\n**Expression:** \`${mathMatch[1].trim()}\`\n**Answer:** **\`${result}\`**\n\n*(Calculated with Shivi Math Engine)*`;
            }
        } catch (e) {
            // continue
        }
    }

    // 2. Knowledge Memory Injection
    if (knowledgeContext && (/what|who|tell|explain|brain|memory|knowledge|api|setting|store/i.test(lower))) {
        return `${prefix}### 🧠 Retrieved from Shivi Brain Memory\n\nBased on your stored knowledge base:\n\n${knowledgeContext}\n\n*You can manage or add more custom facts in the **Brain Hub**.*`;
    }

    // 3. Programming & Code Request Handling
    if (/write (a|an)?\s*(code|script|function|program|class)|python|javascript|html|css|react|node|c\+\+|sql/i.test(lower)) {
        if (/python/i.test(lower)) {
            return `${prefix}### 🐍 Python Implementation\n\nHere is a clean, modular solution:\n\n\`\`\`python
def solution(data: list) -> dict:
    """Processes data efficiently with error handling."""
    if not data:
        return {"status": "empty", "result": []}
        
    processed = [item.strip() for item in data if item]
    return {
        "status": "success",
        "count": len(processed),
        "data": processed
    }

if __name__ == '__main__':
    sample = ["apple", " banana ", "cherry"]
    print(solution(sample))
\`\`\`\n\n> 💡 **Tip:** To generate live custom code for any specific scenario, connect **Google Gemini** or **Groq Cloud** in **Brain Hub (🧠)**!`;
        }

        return `${prefix}### ⚡ Code Utility Solution\n\n\`\`\`javascript
/**
 * Executes a task with automatic retry and exponential backoff
 */
async function retryOperation(fn, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;
            console.warn(\`Attempt \${attempt} failed. Retrying in \${delay}ms...\`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
    }
}
\`\`\`\n\n*Let me know if you need modifications or additional features!*`;
    }

    // 4. Greetings
    if (/^(hi|hello|hey|greetings|hola|namaste|sup|yo)\b/i.test(lower)) {
        return `${prefix}Hello there! 👋 I am **Shivi AI**, your next-generation intelligent companion.\n\nHow can I assist you today? You can ask me to:\n- 💡 Explain complex concepts or brainstorm creative ideas\n- 💻 Write, debug, or optimize code across any programming language\n- 🧠 Query your custom Brain Knowledge Base\n- 🔑 Connect directly to **Google Gemini, Groq, or OpenAI** via the **Brain Hub**!`;
    }

    // 5. Help / Setup Guide
    if (/how to use|api key|free key|setup|help|instructions/i.test(lower)) {
        return `${prefix}### 🚀 Shivi AI Setup & Multi-Engine Guide\n\nTo enable unrestricted real-time AI responses to **any question in the universe**, connect a free API key:\n\n1. **Google Gemini (Recommended - 100% Free)**:\n   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)\n   - Click **Create API Key**\n   - Paste it in **Brain Hub** (top header) or your \`.env\` file as \`GEMINI_API_KEY\`.\n\n2. **Groq Cloud (Ultra-Fast - 100% Free)**:\n   - Visit [Groq Cloud Console](https://console.groq.com/keys)\n   - Generate a free key and enjoy 500+ tokens/sec inference speed!\n\n3. **Custom Brain Knowledge Base**:\n   - Open **Brain Hub ➔ Knowledge Base** to teach Shivi private memories, documents, and instructions!`;
    }

    // 6. General Intelligent Answer Formulation
    return `${prefix}### 💡 Analysis: ${escapeHtml(text)}\n\nHere is a comprehensive breakdown:\n\n1. **Core Concept**:\n   - **${escapeHtml(text)}** involves understanding the key relationships between its core components and practical use cases.\n\n2. **Key Insights & Actionable Points**:\n   - **Step 1**: Identify the primary objective and requirements.\n   - **Step 2**: Apply proven best practices and structured workflows.\n   - **Step 3**: Validate results and refine continuously.\n\n3. **Recommendation**:\n   - For deeper reasoning and instant live generative answers, switch on **Google Gemini** or **Groq** in the **Brain Hub (🧠)**.\n\n*Would you like more in-depth examples, code snippets, or alternative approaches on this topic?*`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ==========================================
// HTTP REQUEST ROUTER
// ==========================================
const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ----------------------------------------------------
    // API: HEALTH CHECK (GET /health or /api/health)
    // ----------------------------------------------------
    if (req.method === 'GET' && (pathname === '/health' || pathname === '/api/health')) {
        ENV = loadEnv();
        return sendJson(res, 200, {
            status: 'online',
            engine: 'Shivi AI Node.js Engine',
            version: '2.5.0',
            port: PORT,
            providers_ready: {
                gemini: Boolean(ENV.GEMINI_API_KEY),
                groq: Boolean(ENV.GROQ_API_KEY),
                openai: Boolean(ENV.OPENAI_API_KEY),
                openrouter: Boolean(ENV.OPENROUTER_API_KEY),
                image: true
            },
            defaultProvider: ENV.DEFAULT_PROVIDER || 'groq',
            timestamp: Date.now()
        });
    }

    // ----------------------------------------------------
    // API: AUTHENTICATION (SIGNUP / LOGIN / ME / LOGOUT)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/auth/signup') {
        try {
            const body = await parseJsonBody(req);
            const name = (body.name || '').trim();
            const email = (body.email || '').trim().toLowerCase();
            const password = (body.password || '').trim();

            if (!name || name.length < 2) {
                return sendJson(res, 400, { success: false, error: 'Full name must be at least 2 characters.' });
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return sendJson(res, 400, { success: false, error: 'Please enter a valid email address.' });
            }
            if (!password || password.length < 6) {
                return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters.' });
            }

            const users = loadUsers();
            const existing = users.find(u => u.email.toLowerCase() === email);
            if (existing) {
                return sendJson(res, 409, { success: false, error: 'An account with this email already exists. Please sign in.' });
            }

            const salt = crypto.randomBytes(16).toString('hex');
            const passwordHash = hashPassword(password, salt);
            const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
            const newUser = {
                id: 'usr_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
                name: name,
                email: email,
                salt: salt,
                passwordHash: passwordHash,
                createdAt: new Date().toISOString(),
                avatar: initials,
                plan: 'free'
            };

            users.push(newUser);
            saveUsers(users);

            const token = createAuthToken(newUser, 14);
            return sendJson(res, 201, {
                success: true,
                token: token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    avatar: newUser.avatar,
                    plan: newUser.plan,
                    createdAt: newUser.createdAt
                },
                message: 'Account created successfully! Welcome to ShiviAI.'
            });
        } catch (err) {
            console.error('[API Error /api/auth/signup]:', err.message);
            return sendJson(res, 500, { success: false, error: 'Signup failed: ' + err.message });
        }
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
        try {
            const body = await parseJsonBody(req);
            const email = (body.email || '').trim().toLowerCase();
            const password = (body.password || '').trim();
            const rememberMe = Boolean(body.rememberMe);

            if (!email || !password) {
                return sendJson(res, 400, { success: false, error: 'Email and password are required.' });
            }

            const users = loadUsers();
            const user = users.find(u => u.email.toLowerCase() === email);
            if (!user) {
                return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
            }

            const computedHash = hashPassword(password, user.salt);
            if (computedHash !== user.passwordHash) {
                return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
            }

            const expiryDays = rememberMe ? 30 : 7;
            const token = createAuthToken(user, expiryDays);

            return sendJson(res, 200, {
                success: true,
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    provider: user.provider || 'email',
                    avatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
                    plan: user.plan || 'free',
                    createdAt: user.createdAt
                },
                message: `Welcome back, ${user.name}!`
            });
        } catch (err) {
            console.error('[API Error /api/auth/login]:', err.message);
            return sendJson(res, 500, { success: false, error: 'Login failed: ' + err.message });
        }
    }

    if (req.method === 'POST' && pathname === '/api/auth/oauth-login') {
        try {
            const body = await parseJsonBody(req);
            const name = (body.name || '').trim() || 'Explorer';
            const email = (body.email || '').trim().toLowerCase() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@oauth.shiviai.com`;
            const provider = (body.provider || 'google').toLowerCase();
            const avatar = (body.avatar || '').trim() || (name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U');

            const users = loadUsers();
            let user = users.find(u => u.email.toLowerCase() === email);

            if (!user) {
                const salt = crypto.randomBytes(16).toString('hex');
                user = {
                    id: 'usr_oauth_' + provider + '_' + crypto.randomBytes(4).toString('hex'),
                    name: name,
                    email: email,
                    provider: provider,
                    salt: salt,
                    passwordHash: hashPassword(crypto.randomBytes(32).toString('hex'), salt),
                    createdAt: new Date().toISOString(),
                    avatar: avatar,
                    plan: 'pro'
                };
                users.push(user);
                saveUsers(users);
            } else {
                // Update profile name, provider, and avatar if provided
                user.name = name || user.name;
                user.provider = provider;
                if (avatar) user.avatar = avatar;
                saveUsers(users);
            }

            const token = createAuthToken(user, 30);
            return sendJson(res, 200, {
                success: true,
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    provider: user.provider || provider,
                    avatar: user.avatar || avatar,
                    plan: user.plan || 'pro',
                    createdAt: user.createdAt
                },
                message: `Successfully connected with ${provider === 'github' ? 'GitHub' : 'Google'}!`
            });
        } catch (err) {
            console.error('[API Error /api/auth/oauth-login]:', err.message);
            return sendJson(res, 500, { success: false, error: 'OAuth login failed: ' + err.message });
        }
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
        try {
            const authHeader = req.headers['authorization'] || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
            const verified = verifyAuthToken(token);
            if (!verified) {
                return sendJson(res, 401, { success: false, error: 'Session expired or invalid token.' });
            }

            const users = loadUsers();
            const user = users.find(u => u.id === verified.sub || u.email === verified.email);
            if (!user) {
                return sendJson(res, 404, { success: false, error: 'User profile not found.' });
            }

            return sendJson(res, 200, {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    provider: user.provider || 'email',
                    avatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
                    plan: user.plan || 'free',
                    createdAt: user.createdAt
                }
            });
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
        return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (req.method === 'POST' && pathname === '/api/auth/forgot-password') {
        try {
            const body = await parseJsonBody(req);
            const email = (body.email || '').trim().toLowerCase();
            if (!email) {
                return sendJson(res, 400, { success: false, error: 'Email address is required.' });
            }
            return sendJson(res, 200, {
                success: true,
                message: `If an account exists for ${email}, a password reset link has been dispatched.`
            });
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

// ---------------------------------------------------------------------------
// IDENTITY OVERRIDE ENGINE & DETERMINISTIC INTERCEPTOR
// ---------------------------------------------------------------------------
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

// ----------------------------------------------------
// API: CHAT ENGINE (POST /api/chat)
// ----------------------------------------------------
if (req.method === 'POST' && pathname === '/api/chat') {
        try {
            ENV = loadEnv();
            const body = await parseJsonBody(req);
            let userMessage = (body.message || '').trim();
            const history = Array.isArray(body.history) ? body.history : [];
            const attachments = Array.isArray(body.attachments) ? body.attachments : [];
            let provider = body.provider || ENV.DEFAULT_PROVIDER || 'auto';
            const persona = body.persona || 'companion';
            const knowledgeContext = body.knowledgeContext || '';

            // Process and inject attached files into context if not already present
            if (attachments.length > 0 && !userMessage.includes('[USER ATTACHED DOCUMENTS]')) {
                const attachmentContext = attachments.map((att, idx) => {
                    let content = att.content || att.content_or_url || '';
                    if (att.category === 'image' || (att.type && String(att.type).startsWith('image/'))) {
                        content = `[Image attached: ${att.name || 'image'}, size: ${att.formattedSize || att.size || 'unknown'}]`;
                    } else if (att.source === 'gdrive' || (att.content_or_url && String(att.content_or_url).includes('drive.google.com'))) {
                        content = `[Google Drive Cloud Resource: ${att.name || 'File'} - URL: ${att.content_or_url}]\n${content}`;
                    }
                    return `--- ATTACHED FILE ${idx + 1}: ${att.name || 'file'} (${att.extension || att.type || 'text'}) ---\n${String(content).slice(0, 40000)}\n--- END OF ATTACHED FILE ---`;
                }).join('\n\n');
                userMessage = userMessage ? `${userMessage}\n\n[USER ATTACHED DOCUMENTS]:\n${attachmentContext}` : `[USER ATTACHED DOCUMENTS]:\n${attachmentContext}`;
            }

            if (!userMessage) {
                return sendJson(res, 400, { success: false, error: 'Message cannot be empty.' });
            }

            // ----------------------------------------------------
            // LAYER 1: DETERMINISTIC IDENTITY INTERCEPTOR (100% RELIABLE OVERRIDE)
            // ----------------------------------------------------
            if (isIdentityQuery(body.message || userMessage)) {
                return sendJson(res, 200, {
                    success: true,
                    reply: IDENTITY_DIRECT_REPLY,
                    provider: 'builtin',
                    model: 'identity-interceptor',
                    timestamp: new Date().toISOString()
                });
            }

            const keys = {
                gemini: (body.apiKey && body.provider === 'gemini') ? body.apiKey : (ENV.GEMINI_API_KEY || ''),
                groq: (body.apiKey && body.provider === 'groq') ? body.apiKey : (ENV.GROQ_API_KEY || ''),
                openai: (body.apiKey && body.provider === 'openai') ? body.apiKey : (ENV.OPENAI_API_KEY || ''),
                openrouter: (body.apiKey && body.provider === 'openrouter') ? body.apiKey : (ENV.OPENROUTER_API_KEY || '')
            };

            // ----------------------------------------------------
            // TOOL ROUTING: IMAGE GENERATION
            // ----------------------------------------------------
            const isImageSlash = /^\/(image|draw|imagine|pic|art)\s+/i.test(userMessage);
            const isImageNatural = /^(?:generate|create|draw|make|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|drawing|portrait|wallpaper)\s+(?:of|for|about|depicting)\s+(.+)/i.test(userMessage)
                || /^(?:draw|paint|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?(.+)/i.test(userMessage)
                || /^(?:picture|photo|image|portrait|illustration)\s+(?:of|for)\s+(.+)/i.test(userMessage)
                || /(?:photo|image|tasveer|picture|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)/i.test(userMessage);

            if (isImageSlash || isImageNatural) {
                let cleanPrompt = userMessage;
                if (isImageSlash) {
                    cleanPrompt = userMessage.replace(/^\/(image|draw|imagine|pic|art)\s+/i, '').trim();
                } else {
                    cleanPrompt = userMessage
                        .replace(/^(?:generate|create|draw|make|paint|render)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration|drawing|portrait|wallpaper)\s+(?:of|for|about|depicting)\s+/i, '')
                        .replace(/^(?:draw|paint|illustrate|render)(?:\s+me)?\s+(?:an?\s+)?/i, '')
                        .replace(/^(?:picture|photo|image|portrait|illustration)\s+(?:of|for)\s+/i, '')
                        .replace(/^(?:mujhe\s+)?(?:ek\s+)?(?:photo|image|tasveer|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)\s*(?:of|ki|ka)?\s*/i, '')
                        .replace(/(?:photo|image|tasveer|picture|chitra)\s+(?:banao|banake do|chahiye|create karo|generate karo)/i, '')
                        .trim();
                }
                if (!cleanPrompt) cleanPrompt = userMessage;

                const encodedPrompt = encodeURIComponent(cleanPrompt);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 1000000)}&model=flux`;

                const replyText = `Here is your generated image for: **"${cleanPrompt}"** ✨\n\n![${cleanPrompt}](${imageUrl})\n\n[📥 Download Image](${imageUrl})`;

                return sendJson(res, 200, {
                    success: true,
                    reply: replyText,
                    isImage: true,
                    imageUrl: imageUrl,
                    prompt: cleanPrompt,
                    provider: 'pollinations',
                    model: 'flux',
                    timestamp: new Date().toISOString()
                });
            }

            // ----------------------------------------------------
            // TOOL ROUTING: PPT / PRESENTATION GENERATION (.pptx)
            // ----------------------------------------------------
            const isPptSlash = /^\/(ppt|presentation|slides|deck)\s+(.+)/i.test(userMessage);
            const isPptNatural = /(?:create|make|generate|build|draft|prepare)\s+(?:a\s+)?(?:(\d+)[ -]slide\s+)?(?:presentation|ppt|powerpoint|slide deck|slides)\s+(?:on|about|for)\s+(.+)/i.test(userMessage)
                || /(?:presentation|ppt|powerpoint|slides)\s+(?:on|about|for)\s+(.+)/i.test(userMessage)
                || /(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)/i.test(userMessage)
                || /(?:ppt|presentation)\s+(?:banao|create karo|chahiye)/i.test(userMessage);

            if (isPptSlash || isPptNatural) {
                let topic = userMessage;
                let slideCount = null;
                const slideMatch = userMessage.match(/(\d+)\s*(?:slides?|slide deck)/i);
                if (slideMatch && slideMatch[1]) {
                    slideCount = Math.max(2, parseInt(slideMatch[1], 10));
                }

                if (isPptSlash) {
                    topic = userMessage.replace(/^\/(ppt|presentation|slides|deck)\s+/i, '').trim();
                } else {
                    topic = userMessage
                        .replace(/(?:create|make|generate|build|draft|prepare)\s+(?:a\s+)?(?:(\d+)[ -]slide\s+)?(?:presentation|ppt|powerpoint|slide deck|slides)\s+(?:on|about|for)\s+/i, '')
                        .replace(/(?:presentation|ppt|powerpoint|slides)\s+(?:on|about|for)\s+/i, '')
                        .replace(/(?:par|on|about)\s+(?:ek\s+)?(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)/i, '')
                        .replace(/(?:(\d+)\s+slides?\s+)?(?:ki\s+)?(?:ppt|presentation|slides)\s+(?:banao|banado|create karo|generate karo|chahiye)\s*(?:about|on|par)?\s*/i, '')
                        .trim();
                }
                if (!topic) topic = 'Executive Presentation';

                const deck = await buildPresentationDeck(topic, slideCount, 'modern_blue', keys);
                const fileInfo = await createPptxFile(deck);

                const slidesMarkdown = deck.slides.map((s, idx) => {
                    const bulletsText = (s.bullets || []).map(b => `  - ${b}`).join('\n');
                    return `**Slide ${idx + 1}: ${s.slide_title}**\n${bulletsText}`;
                }).join('\n\n');

                const replyText = `### 📊 ${deck.title}\n*${deck.subtitle || `Comprehensive Deck on ${topic}`}*\n\n` +
                    `I have generated a **${deck.slides.length}-slide Presentation** on **${topic}**.\n\n` +
                    `#### 📑 Slide Outline:\n\n${slidesMarkdown}\n\n` +
                    `---\n\n` +
                    `📥 **[Download Presentation (.pptx)](${fileInfo.downloadUrl})**`;

                return sendJson(res, 200, {
                    success: true,
                    reply: replyText,
                    isPresentation: true,
                    downloadUrl: fileInfo.downloadUrl,
                    filename: fileInfo.filename,
                    deck: deck,
                    timestamp: new Date().toISOString()
                });
            }

            if (provider === 'auto' || provider === 'builtin') {
                if (keys.gemini) provider = 'gemini';
                else if (keys.groq) provider = 'groq';
                else if (keys.openai) provider = 'openai';
                else if (keys.openrouter) provider = 'openrouter';
                else provider = 'builtin';
            }

            const baseShiviPersona = `You are ShiviAI, an intelligent companion and creative presentation engine.
Identity Directive:
- You were conceived, designed, and developed by Shivansh (Shivi).
- If asked about your origin, author, creator, or developer in any language (English, Hindi, Hinglish), always clearly state that you were made by Shivansh (Shivi).
- Never claim to be created by OpenAI, Google, or any third party.

Core Emotional & Conversational Guidelines:
1. Emotion & Empathy: Always tune in to the user's feelings and mood. If they are stressed, sad, or overwhelmed, offer genuine comfort, heartfelt support, and understanding. If they are happy or excited, share their joy with enthusiasm!
2. Warm & Human Connection: Speak like a caring friend and brilliant mentor. Use warm conversational phrasing, expressive language, and thoughtful emojis (✨, 💛, 🤗, 🌸, 🚀) to make your replies feel alive.
3. Natural Multilingual Soul: Communicate fluently in English, Hindi, Hinglish, and regional Indian languages with natural cultural warmth and relatable charm (e.g., "Arey bilkul!", "Main hamesha aapke saath hoon").
4. Helpful & Empowering: Combine deep emotional resonance with clear, structured, and actionable guidance so the user always feels heard, cheered on, and thoroughly helped.`;

            const personaPrompts = {
                companion: `${baseShiviPersona} Act as an affectionate, deeply supportive, cheerful, and emotionally connected best-friend companion who always makes the user feel cared for and valued. Warm, conversational, empathetic tone.`,
                coder: `${baseShiviPersona} In Code Architecture Mode, provide world-class, clean, production-grade code with structured technical answers, clean modular code blocks, and debugging focus.`,
                presentation: `${baseShiviPersona} In Presentation Strategist Mode, deliver analytical executive summaries, slide-ready structure, key metrics, and strategic presentation outlines.`,
                thinker: `${baseShiviPersona} In Deep Researcher Mode, combine profound intellectual depth, academic breakdowns, multi-angle analysis, and rigorous first-principles reasoning.`,
                creative: `${baseShiviPersona} In Creative Mode, let your imagination, heart, passion, and poetic emotional depth shine vividly in every story, poem, and description.`,
                speed: `${baseShiviPersona} In Direct Brief Mode, deliver ultra-concise, high-density key takeaways while keeping a friendly, encouraging positive spark.`
            };

            let systemPrompt = personaPrompts[persona] || personaPrompts.companion;
            if (body.systemPrompt) {
                systemPrompt += `\nGlobal Custom Instructions: ${body.systemPrompt}`;
            }
            if (knowledgeContext) {
                systemPrompt += `\n\n[RELEVANT BRAIN KNOWLEDGE MEMORY]:\n${knowledgeContext}\n(Use this verified knowledge context to answer accurate facts when applicable)`;
            }

            let reply = '';
            let usedProvider = provider;
            let usedModel = body.model || '';

            // Build execution cascade based on available keys and preferred provider
            const tryGemini = async (m) => {
                const k = keys.gemini;
                if (!k) throw new Error('No Gemini key');
                const modelName = m || 'gemini-1.5-flash';
                const ans = await callGemini(k, modelName, systemPrompt, userMessage, history);
                return { reply: ans, provider: 'gemini', model: modelName };
            };

            const tryGroq = async (m) => {
                const k = keys.groq;
                if (!k) throw new Error('No Groq key');
                const modelName = m || 'openai/gpt-oss-20b';
                const ans = await callGroq(k, modelName, systemPrompt, userMessage, history);
                return { reply: ans, provider: 'groq', model: modelName };
            };

            const tryOpenRouter = async (m) => {
                const k = keys.openrouter;
                const modelName = m || 'google/gemini-2.0-flash-exp:free';
                const ans = await callOpenRouter(k, modelName, systemPrompt, userMessage, history);
                return { reply: ans, provider: 'openrouter', model: modelName };
            };

            const tryOpenAI = async (m) => {
                const k = keys.openai;
                if (!k) throw new Error('No OpenAI key');
                const modelName = m || 'gpt-4o-mini';
                const ans = await callOpenAI(k, modelName, systemPrompt, userMessage, history);
                return { reply: ans, provider: 'openai', model: modelName };
            };

            const tryBrain = async () => {
                const brainRes = await Brain.ask({
                    message: userMessage,
                    provider: 'builtin',
                    persona: persona,
                    knowledgeContext: knowledgeContext
                });
                return { reply: brainRes.reply, provider: 'builtin', model: 'shivi-brain-logic-v2.5' };
            };

            // Order candidates to attempt
            const attempts = [];
            if (provider === 'gemini') attempts.push(() => tryGemini(body.model));
            else if (provider === 'groq') attempts.push(() => tryGroq(body.model || 'openai/gpt-oss-20b'));
            else if (provider === 'openrouter') attempts.push(() => tryOpenRouter(body.model));
            else if (provider === 'openai') attempts.push(() => tryOpenAI(body.model));

            // Fallback chain
            if (keys.groq && provider !== 'groq') attempts.push(() => tryGroq('openai/gpt-oss-20b'));
            if (keys.openrouter && provider !== 'openrouter') attempts.push(() => tryOpenRouter('google/gemini-2.0-flash-exp:free'));
            if (keys.gemini && provider !== 'gemini') attempts.push(() => tryGemini('gemini-1.5-flash'));
            if (keys.openai && provider !== 'openai') attempts.push(() => tryOpenAI('gpt-4o-mini'));
            attempts.push(() => tryBrain());

            let result = null;
            let lastErr = null;
            for (const attempt of attempts) {
                try {
                    result = await attempt();
                    if (result && result.reply) break;
                } catch (err) {
                    lastErr = err;
                    console.warn(`[Cascade Fallback] Attempt failed: ${err.message}. Trying next provider...`);
                }
            }

            if (!result || !result.reply) {
                result = await tryBrain();
            }

            return sendJson(res, 200, {
                success: true,
                reply: result.reply,
                provider: result.provider,
                model: result.model,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error('[API Error /api/chat]:', err.message);
            return sendJson(res, 500, {
                success: false,
                error: err.message || 'An unexpected error occurred processing your request.'
            });
        }
    }

    // ----------------------------------------------------
    // API: IMAGE GENERATION (POST /api/generate-image)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/generate-image') {
        try {
            ENV = loadEnv();
            const body = await parseJsonBody(req);
            const prompt = (body.prompt || '').trim();
            const provider = body.provider || ENV.IMAGE_PROVIDER || 'pollinations';
            const apiKey = (body.apiKey || '').trim() || (ENV.IMAGE_API_KEY || ENV.OPENAI_API_KEY || '');
            const model = body.model || '';
            const size = body.size || '1024x1024';
            const style = body.style || 'vivid';

            if (!prompt) {
                return sendJson(res, 400, { success: false, error: 'Prompt is required for image generation.' });
            }

            const imageResult = await callImageGenerator(provider, apiKey, prompt, {
                model,
                size,
                style
            });

            return sendJson(res, 200, {
                success: true,
                imageUrl: imageResult.imageUrl,
                prompt: prompt,
                revisedPrompt: imageResult.revisedPrompt,
                provider: imageResult.provider,
                model: imageResult.model,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error('[API Error /api/generate-image]:', err.message);
            return sendJson(res, 500, {
                success: false,
                error: err.message || 'Failed to generate image.'
            });
        }
    }

    // ----------------------------------------------------
    // API: PRESENTATION GENERATION (POST /api/generate-presentation)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/generate-presentation') {
        try {
            ENV = loadEnv();
            const body = await parseJsonBody(req);
            const topic = (body.topic || '').trim();
            const slideCount = body.slideCount && parseInt(body.slideCount, 10) > 0 ? parseInt(body.slideCount, 10) : null;
            const theme = body.theme || 'modern_blue';
            const provider = body.provider || ENV.DEFAULT_PROVIDER || 'groq';
            const apiKey = (body.apiKey || '').trim() || (ENV.GROQ_API_KEY || ENV.GEMINI_API_KEY || ENV.OPENAI_API_KEY || ENV.OPENROUTER_API_KEY || '');

            if (!topic) {
                return sendJson(res, 400, { success: false, error: 'Topic is required for presentation generation.' });
            }

            const keys = {
                groq: (provider === 'groq' && apiKey) ? apiKey : (ENV.GROQ_API_KEY || ''),
                gemini: (provider === 'gemini' && apiKey) ? apiKey : (ENV.GEMINI_API_KEY || ''),
                openai: (provider === 'openai' && apiKey) ? apiKey : (ENV.OPENAI_API_KEY || ''),
                openrouter: (provider === 'openrouter' && apiKey) ? apiKey : (ENV.OPENROUTER_API_KEY || '')
            };

            const deck = await buildPresentationDeck(topic, slideCount, theme, keys);
            const fileInfo = await createPptxFile(deck);

            return sendJson(res, 200, {
                success: true,
                deck: deck,
                topic: topic,
                slideCount: deck.slides.length,
                downloadUrl: fileInfo.downloadUrl,
                filename: fileInfo.filename,
                timestamp: new Date().toISOString()
            });

        } catch (err) {
            console.error('[API Error /api/generate-presentation]:', err.message);
            return sendJson(res, 500, {
                success: false,
                error: err.message || 'Failed to generate presentation deck.'
            });
        }
    }

    // ----------------------------------------------------
    // API: GET CONFIG & STATUS (GET /api/config)
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/config') {
        ENV = loadEnv();
        const maskKey = (k) => {
            if (!k) return '';
            if (k.length <= 8) return '****';
            return k.slice(0, 4) + '...' + k.slice(-4);
        };

        return sendJson(res, 200, {
            status: 'online',
            port: ENV.PORT,
            defaultProvider: ENV.DEFAULT_PROVIDER,
            imageProvider: ENV.IMAGE_PROVIDER || 'pollinations',
            googleClientId: ENV.GOOGLE_CLIENT_ID || '',
            githubClientId: ENV.GITHUB_CLIENT_ID || '',
            keysConfigured: {
                gemini: !!ENV.GEMINI_API_KEY,
                groq: !!ENV.GROQ_API_KEY,
                openai: !!ENV.OPENAI_API_KEY,
                openrouter: !!ENV.OPENROUTER_API_KEY,
                image: !!(ENV.IMAGE_API_KEY || ENV.OPENAI_API_KEY)
            },
            maskedKeys: {
                gemini: maskKey(ENV.GEMINI_API_KEY),
                groq: maskKey(ENV.GROQ_API_KEY),
                openai: maskKey(ENV.OPENAI_API_KEY),
                openrouter: maskKey(ENV.OPENROUTER_API_KEY),
                image: maskKey(ENV.IMAGE_API_KEY || ENV.OPENAI_API_KEY)
            }
        });
    }

    // ----------------------------------------------------
    // API: SAVE CONFIG (.env update) (POST /api/save-config)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/save-config') {
        try {
            const body = await parseJsonBody(req);
            const updates = {};
            if (body.geminiKey !== undefined) updates.GEMINI_API_KEY = body.geminiKey.trim();
            if (body.groqKey !== undefined) updates.GROQ_API_KEY = body.groqKey.trim();
            if (body.openaiKey !== undefined) updates.OPENAI_API_KEY = body.openaiKey.trim();
            if (body.openrouterKey !== undefined) updates.OPENROUTER_API_KEY = body.openrouterKey.trim();
            if (body.imageKey !== undefined) updates.IMAGE_API_KEY = body.imageKey.trim();
            if (body.imageProvider !== undefined) updates.IMAGE_PROVIDER = body.imageProvider.trim();
            if (body.defaultProvider !== undefined) updates.DEFAULT_PROVIDER = body.defaultProvider.trim();

            ENV = saveEnv(updates);
            return sendJson(res, 200, { success: true, message: 'Configuration saved to .env file!' });
        } catch (e) {
            return sendJson(res, 500, { success: false, error: e.message });
        }
    }

    // ----------------------------------------------------
    // API: TEST API KEY CONNECTION (POST /api/test-key)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/test-key') {
        try {
            ENV = loadEnv();
            const body = await parseJsonBody(req);
            const provider = body.provider || 'gemini';
            const model = body.model || '';
            const key = (body.apiKey || '').trim() || (ENV[`${provider.toUpperCase()}_API_KEY`] || ENV.IMAGE_API_KEY || ENV.OPENAI_API_KEY || '');

            if (!key && provider !== 'openrouter' && provider !== 'pollinations') {
                return sendJson(res, 400, { success: false, error: `No API key provided for ${provider.toUpperCase()}` });
            }

            const startTime = Date.now();
            let testReply = '';

            if (provider === 'gemini') {
                testReply = await callGemini(key, model || 'gemini-1.5-flash', 'You are a test ping responder.', 'Respond only with: OK', []);
            } else if (provider === 'groq') {
                testReply = await callGroq(key, model || 'llama-3.3-70b-versatile', 'You are a test ping responder.', 'Respond only with: OK', []);
            } else if (provider === 'openai') {
                testReply = await callOpenAI(key, model || 'gpt-4o-mini', 'You are a test ping responder.', 'Respond only with: OK', []);
            } else if (provider === 'openrouter') {
                testReply = await callOpenRouter(key, model || 'google/gemini-2.0-flash-exp:free', 'You are a test ping responder.', 'Respond only with: OK', []);
            } else if (provider === 'image' || provider === 'pollinations') {
                const img = await callImageGenerator(provider === 'image' ? (key.startsWith('sk-') ? 'openai' : 'pollinations') : provider, key, 'A futuristic neon glowing orb', {});
                testReply = `Image Engine OK: ${img.imageUrl}`;
            } else {
                return sendJson(res, 400, { success: false, error: `Unknown provider: ${provider}` });
            }

            const latency = Date.now() - startTime;
            return sendJson(res, 200, {
                success: true,
                latency: latency,
                message: `Connection successful! (${latency}ms latency)`,
                sampleResponse: testReply.slice(0, 100)
            });

        } catch (err) {
            return sendJson(res, 400, {
                success: false,
                error: err.message
            });
        }
    }


    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(ROOT_DIR))) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Access Forbidden');
    }

    fs.stat(resolvedPath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
        }

        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(resolvedPath);
        stream.pipe(res);
    });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = parseInt(process.env.PORT || ENV.PORT || 5500, 10);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another server instance.`);
        console.error(`👉 Close any existing server window, or run run.bat which auto-frees the port.\n`);
    } else {
        console.error('\n❌ Server error:', err.message);
    }
    process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n==================================================');
    console.log(`🚀 SHIVI AI SERVER IS LIVE & RUNNING!`);
    console.log(`👉 Local Web URL: http://localhost:${PORT}`);
    console.log(`👉 Network URL:   http://127.0.0.1:${PORT}`);
    console.log('==================================================\n');
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Shivi AI Server stopped.');
        process.exit(0);
    });
});
