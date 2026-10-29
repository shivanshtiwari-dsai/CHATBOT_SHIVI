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
const { enhanceImagePrompt, buildOptimizedImageUrl, buildFastFallbackImageUrl } = require('./imageService.js');
const { connectDB, isMongoConnected, getConnectionStatus } = require('./config/db.js');
const storage = require('./services/storageService.js');

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

function getAuthenticatedUser(req) {
    const authHeader = (req && req.headers && req.headers['authorization']) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (!token) return null;
    return verifyAuthToken(token);
}

// ==========================================
// ENVIRONMENT LOADER (.env parser)
// ==========================================
function loadEnv() {
    const env = {
        PORT: 5500,
        MONGO_URI: 'mongodb://127.0.0.1:27017/shiviai_db',
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

    for (const k of ['PORT', 'MONGO_URI', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'IMAGE_API_KEY', 'IMAGE_PROVIDER', 'DEFAULT_PROVIDER', 'GOOGLE_CLIENT_ID', 'GITHUB_CLIENT_ID']) {
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
        '# 🍃 MONGODB DATABASE CONFIGURATION',
        `MONGO_URI=${merged.MONGO_URI || 'mongodb://127.0.0.1:27017/shiviai_db'}`,
        '',
        '# 🔑 OAUTH CONFIGURATION',
        `GOOGLE_CLIENT_ID=${merged.GOOGLE_CLIENT_ID || ''}`,
        `GITHUB_CLIENT_ID=${merged.GITHUB_CLIENT_ID || ''}`,
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

// ==========================================
// MULTI-PROVIDER AI CALLERS
// ==========================================

async function callGemini(apiKey, model, systemPrompt, userMessage, history = [], options = {}) {
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
            temperature: options.temperature !== undefined ? options.temperature : 0.7,
            maxOutputTokens: options.max_tokens || 8192
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

async function callOpenAI(apiKey, model, systemPrompt, userMessage, history = [], options = {}) {
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
            temperature: options.temperature !== undefined ? options.temperature : 0.7,
            max_tokens: options.max_tokens || 8192
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

async function callOpenRouter(apiKey, model, systemPrompt, userMessage, history = [], options = {}) {
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
            temperature: options.temperature !== undefined ? options.temperature : 0.7,
            max_tokens: options.max_tokens || 8192
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
    const size = options.size || '1280x720';
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

    // 2. Pollinations.ai Flux AI (High-Resolution 1280x720 16:9 Endpoint with Flux Model for Peak Clarity)
    const [w, h] = size.includes('x') ? size.split('x').map(Number) : [1280, 720];
    const width = w || 1280;
    const height = h || 720;
    const seed = options.seed || Math.floor(Math.random() * 10000000);
    const targetModel = options.model || 'flux';
    const pollinationsUrl = buildOptimizedImageUrl(enhancedPrompt, seed, width, height, targetModel);
    const fallbackUrl = buildFastFallbackImageUrl(enhancedPrompt, seed, width, height);

    return {
        imageUrl: pollinationsUrl,
        fallbackUrl: fallbackUrl,
        revisedPrompt: enhanceImagePrompt(enhancedPrompt),
        provider: 'pollinations',
        model: targetModel
    };
}

// ==========================================
// PRESENTATION (.PPTX) GENERATOR & DECK BUILDER
// ==========================================

function hashCode(str) {
    let hash = 0;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

// Banned generic/abstract terms that produce non-contextual images
const _IMAGE_ABSTRACT_TERMS = /\b(abstract|surreal|geometric shapes?|neon glow|digital wave|glowing swirls?|3D data visualization|hologram|futuristic background|technology background|digital transformation|innovation concept|business concept|modern technology|artificial intelligence concept|data concept|futuristic city|blockchain network)\b/gi;
const _STYLE_SUFFIX = 'high resolution documentary photography, editorial photo, realistic lighting, 4k, hyper-detailed, clean sharp focus, authentic real-world context';

function buildContextualSlideImageUrl(slide, topic, index) {
    const slideObj = slide || {};
    const rawTitle = slideObj.title || slideObj.slide_title || '';
    const keySubject = String(rawTitle).replace(/[^a-zA-Z0-9 ]/g, '').trim();

    // Priority: image_prompt > visual_description > image_search_query > bullets
    let specificContext = String(
        slideObj.image_prompt ||
        slideObj.visual_description ||
        slideObj.image_search_query || ''
    ).trim();

    // If still empty, derive from first bullet's descriptive portion
    if (!specificContext && Array.isArray(slideObj.bullets) && slideObj.bullets.length > 0) {
        for (const b of slideObj.bullets) {
            let stripped = String(b).replace(/^\*\*.*?\*\*:\s*/, '').replace(/[^a-zA-Z0-9 ,.]/g, '').trim();
            if (stripped.length > 20) {
                specificContext = stripped.slice(0, 120);
                break;
            }
        }
    }

    if (!specificContext) {
        specificContext = `${topic} ${keySubject}`.trim() || `${topic} slide ${index}`;
    }

    // Ban generic abstract or surreal buzzwords so photos remain strictly contextual
    specificContext = specificContext.replace(_IMAGE_ABSTRACT_TERMS, '').replace(/\s{2,}/g, ' ').trim();
    if (!specificContext || specificContext.length < 10) {
        specificContext = `${topic} operational environment, ${keySubject}`;
    }

    // Generate staggered seed based on slide index and use lightweight turbo model
    const safeIndex = parseInt(index, 10) || 1;
    const seed = safeIndex * 137;
    const prompt = encodeURIComponent(`${specificContext}, corporate tech, realistic, 8k`);

    return `https://image.pollinations.ai/prompt/${prompt}?width=800&height=500&nologo=true&model=turbo&seed=${seed}`;
}

function repairTruncatedJson(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return null;

    // Pass 1: Strip markdown code fences
    let text = jsonStr.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

    // Pass 2: Slice from first '{' to discard any conversational preamble
    const firstBrace = text.indexOf('{');
    if (firstBrace === -1) return null;
    text = text.substring(firstBrace).trim();

    // Pass 3: Clean JSON.parse attempt
    try {
        return JSON.parse(text);
    } catch (e) {
        // Fall through to bracket balancing
    }

    // Pass 4: Balance unmatched braces and brackets
    function balanceBrackets(s) {
        const openBraces = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
        const openBrackets = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
        let balanced = s.replace(/,\s*$/, '').trim();
        if (openBrackets > 0) balanced += ']'.repeat(openBrackets);
        if (openBraces > 0) balanced += '}'.repeat(openBraces);
        return balanced;
    }

    try {
        const balanced = balanceBrackets(text);
        const res = JSON.parse(balanced);
        if (res && Array.isArray(res.slides) && res.slides.length > 0) {
            return res;
        }
    } catch (e) {
        // Fall through to partial slide recovery
    }

    // Pass 5: Partial slide recovery — walk depth to salvage complete slides
    const slidesIndex = text.indexOf('"slides"');
    if (slidesIndex === -1) return null;

    const arrOpen = text.indexOf('[', slidesIndex);
    if (arrOpen === -1) return null;

    let depth = 0;
    let lastCompleteEnd = -1;
    for (let i = arrOpen + 1; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) lastCompleteEnd = i;
        }
    }

    if (lastCompleteEnd > arrOpen) {
        const outerPrefix = text.substring(0, slidesIndex);
        const slidesBody = text.substring(arrOpen + 1, lastCompleteEnd + 1).replace(/,\s*$/, '');
        const candidate = outerPrefix + '"slides": [' + slidesBody + ']}';
        try {
            const res = JSON.parse(candidate);
            if (res && Array.isArray(res.slides) && res.slides.length > 0) {
                console.log(`[JSON Partial Recovery]: Recovered ${res.slides.length} slides from truncated response.`);
                return res;
            }
        } catch (e) {
            console.warn('[Truncated JSON Recovery Failed]:', e.message);
        }
    }

    return null;
}

function normalizePresentationDeck(rawDeck, topic = 'Executive Keynote', fallbackCount = 5) {
    const targetCount = Math.min(20, Math.max(5, (fallbackCount && !isNaN(fallbackCount)) ? parseInt(fallbackCount, 10) : 5));

    if (!rawDeck || typeof rawDeck !== 'object') {
        return generateRichFallbackDeck(topic, targetCount);
    }

    const cleanTopic = String(topic || 'Strategic Initiative').trim();
    const rawTitle = rawDeck.deck_title || rawDeck.title || (cleanTopic ? `${cleanTopic}: Executive Masterclass` : 'Keynote Presentation');
    const deckTitle = String(rawTitle).trim().replace(/^["']|["']$/g, '');
    const theme = String(rawDeck.theme || 'dark_modern').toLowerCase();
    const rawSlides = Array.isArray(rawDeck.slides) ? rawDeck.slides : [];

    if (rawSlides.length === 0) {
        return generateRichFallbackDeck(cleanTopic, targetCount, theme);
    }

    const normalizedSlides = [];

    rawSlides.forEach((s, idx) => {
        if (!s || typeof s !== 'object') return;
        const slideNum = idx + 1;

        // 1. Layout Type
        const rawLayout = String(s.layout_type || s.layout || '').toLowerCase();
        const layoutType = (idx === 0 || rawLayout.includes('title')) ? 'title_hero' : 'split_image_content';

        // 2. Category / Kicker
        const defaultCat = idx === 0 ? 'EXECUTIVE BRIEFING' : (idx === 1 ? 'STRATEGIC OBJECTIVE' : (idx === rawSlides.length - 1 ? 'STRATEGIC ROADMAP' : `CORE PILLAR 0${idx}`));
        const category = String(s.category || s.badge || defaultCat).toUpperCase().trim();

        // 3. Slide Title & Subtitle
        const rawSt = String(s.title || s.slide_title || `Strategic Vector 0${slideNum}`).trim();
        const slideTitle = rawSt !== cleanTopic ? rawSt : `Strategic Insights: ${cleanTopic}`;
        const subtitle = String(s.subtitle || '').trim();

        // 4. Objective
        let objective = String(s.objective || s.speaker_notes || '').trim();
        if (!objective) {
            if (idx === 0) objective = `Deliver an authoritative, C-level executive briefing on ${cleanTopic}.`;
            else if (idx === 1) objective = 'Define measurable milestones and overcome existing structural bottlenecks.';
            else if (idx === rawSlides.length - 1) objective = 'Actionable implementation roadmap and immediate leadership mandate.';
            else objective = 'Deep-dive analysis of core mechanisms and impact drivers.';
        }

        // 5. Bullets
        let rawBulletsList = [];
        if (Array.isArray(s.bullets) && s.bullets.length > 0) {
            s.bullets.forEach(b => {
                const bStr = String(b).trim();
                if (bStr) rawBulletsList.push(bStr);
            });
        } else if (Array.isArray(s.cards_or_points) && s.cards_or_points.length > 0) {
            s.cards_or_points.forEach(c => {
                if (c && typeof c === 'object') {
                    const t = String(c.title || c.label || 'Core Vector').trim();
                    const d = String(c.description || c.detail || '').trim();
                    rawBulletsList.push(`**${t}**: ${d}`);
                } else if (typeof c === 'string' && c.trim()) {
                    rawBulletsList.push(c.trim());
                }
            });
        }

        // Strict bullet sanitization: filter out placeholders, shallow points, and title/topic repeats
        const titleLower = slideTitle.toLowerCase().trim();
        const topicLower = cleanTopic.toLowerCase().trim();
        const deckLower = deckTitle.toLowerCase().trim();
        const placeholderRegex = /^(placeholder|lorem ipsum|bullet point|sample point|click to edit|point \d+|item \d+)\b/i;

        const cleanedBullets = [];
        for (const b of rawBulletsList) {
            let bClean = String(b).replace(/^[•\-\*]\s*/, '').trim();
            if (!bClean || bClean.length < 15) continue;
            if (placeholderRegex.test(bClean)) continue;

            const coreText = bClean.replace(/^\*\*.*?\*\*:\s*/, '').trim().toLowerCase();
            if (coreText === titleLower || coreText === topicLower || coreText === deckLower) continue;
            if ([titleLower, topicLower, deckLower].includes(bClean.toLowerCase().replace(/[\*: ]/g, ''))) continue;

            // Ensure "**Keyword**: Content" format
            const match = bClean.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
            if (!match) {
                if (bClean.includes(':')) {
                    const parts = bClean.split(':');
                    const kw = parts[0].replace(/\*/g, '').trim();
                    const desc = parts.slice(1).join(':').trim();
                    bClean = `**${kw}**: ${desc}`;
                } else {
                    const words = bClean.split(/\s+/);
                    const kw = words.slice(0, 2).join(' ').replace(/\*/g, '').trim();
                    const desc = words.slice(2).join(' ').trim();
                    bClean = desc ? `**${kw}**: ${desc}` : `**Core Vector**: ${bClean}`;
                }
            }

            cleanedBullets.push(bClean);
        }

        let bullets = cleanedBullets;

        if (bullets.length < 3) {
            const t = cleanTopic;
            if (idx === 0) {
                bullets = [
                    `**Strategic Intent**: Defines the transformative vision, architectural blueprint, and measurable deliverables required to operationalize ${t} at enterprise scale.`,
                    `**Target Audience**: Structured for C-suite executives, engineering directors, and cross-functional leads driving ${t} adoption across organizational units.`,
                    `**Execution Scope**: Covers the end-to-end operational lifecycle from foundational architecture to resilient production deployment.`
                ];
            } else if (idx === 1) {
                bullets = [
                    `**Operational Efficiency**: Automating redundant manual workflows within ${t} pipelines reduces cycle time by up to 35% and eliminates human error at scale.`,
                    `**System Reliability**: Implementing real-time telemetry and circuit-breaker verification checks ensures ${t} infrastructure maintains 99.9% SLA compliance under peak load.`,
                    `**Scalable Architecture**: Decoupling ${t} service components introduces modularity, enabling predictable horizontal throughput as data density and user concurrency expand.`
                ];
            } else if (idx === rawSlides.length - 1) {
                bullets = [
                    `**Phase 1 Foundation (Days 1–14)**: Establish ${t} telemetry baselines, onboard a cross-functional pilot team, and validate core infrastructure dependencies.`,
                    `**Continuous Verification**: Expand deployment with automated benchmark validation gates ensuring rigorous production SLA compliance.`,
                    `**Measurable ROI Targets**: Quantify capital efficiency gains through iterative ${t} feedback loops, targeting a minimum 3× return on investment within 90 days.`
                ];
            } else {
                bullets = [
                    `**Architectural Decoupling**: Partitioning ${t} execution pathways eliminates single points of failure while sustaining deterministic, auditable throughput under concurrent load.`,
                    `**Empirical Benchmarks**: Verified ${t} telemetry across production workloads demonstrates a 3.4× compression in end-to-end latency overhead compared to monolithic baselines.`,
                    `**Adaptive Scaling**: Autonomous ${t} monitoring agents dynamically rebalance computational resources in real time as traffic patterns and data ingestion rates fluctuate.`
                ];
            }
        }

        // Backward-compatible cards_or_points
        const cardsOrPoints = bullets.map((bText, bIdx) => {
            const match = bText.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
            let kTitle, kDesc;
            if (match) {
                kTitle = match[1].trim();
                kDesc = match[2].trim();
            } else if (bText.includes(':')) {
                const parts = bText.split(':');
                kTitle = parts[0].replace(/\*/g, '').trim();
                kDesc = parts.slice(1).join(':').trim();
            } else {
                kTitle = `Pillar 0${bIdx + 1}`;
                kDesc = bText;
            }
            return {
                title: kTitle,
                label: kTitle,
                description: kDesc,
                detail: kDesc,
                tag: category || kTitle
            };
        });

        // 6. Contextual Photo Prompt & URLs via buildContextualSlideImageUrl
        const imgUrl = buildContextualSlideImageUrl(s, cleanTopic, slideNum);
        const safeIndex = parseInt(slideNum, 10) || 1;
        const seed = safeIndex * 137;
        const rawIp = String(s.image_prompt || s.visual_description || s.image_search_query || `${cleanTopic} ${slideTitle}`).replace(_IMAGE_ABSTRACT_TERMS, '').replace(/\s{2,}/g, ' ').trim();
        const fallbackUrl = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
        const enhancedPrompt = enhanceImagePrompt(rawIp);

        let speakerNotes = String(s.speaker_notes || '').trim();
        if (!speakerNotes || speakerNotes.length < 30) {
            const primaryLead = bullets[0] ? bullets[0].replace(/^\*\*.*?\*\*:\s*/, '').slice(0, 30) : 'this pillar';
            speakerNotes = `In this slide, we examine ${slideTitle}. Notice how ${primaryLead} establishes the baseline imperative for this domain. Our objective is clear: ${objective}`;
        }

        normalizedSlides.push({
            slide_number: slideNum,
            layout_type: layoutType,
            layout: layoutType,
            category: category,
            badge: category,
            title: slideTitle,
            slide_title: slideTitle,
            subtitle: subtitle,
            objective: objective,
            bullets: bullets.slice(0, 4),
            cards_or_points: cardsOrPoints.slice(0, 4),
            image_search_query: s.image_search_query || `${cleanTopic} ${slideTitle}`,
            visual_description: s.visual_description || enhancedPrompt,
            image_prompt: enhancedPrompt,
            image_url: imgUrl,
            fallback_image_url: fallbackUrl,
            highlight_metric: {
                value: 'Tier-1',
                caption: `Standard for ${cleanTopic}`
            },
        });
    });

    // If fewer slides were generated than requested, backfill from the rich 20-slide library
    if (normalizedSlides.length < targetCount) {
        const fallback = generateRichFallbackDeck(cleanTopic, targetCount, theme);
        const backfills = fallback.slides.slice(normalizedSlides.length, targetCount);
        backfills.forEach(bs => {
            bs.slide_number = normalizedSlides.length + 1;
            normalizedSlides.push(bs);
        });
    }

    const finalSlides = normalizedSlides.slice(0, targetCount);
    finalSlides.forEach((s, i) => { s.slide_number = i + 1; });

    return {
        deck_title: deckTitle,
        title: deckTitle,
        topic: cleanTopic,
        theme: theme,
        total_slides: finalSlides.length,
        slides: finalSlides
    };
}

function generateRichFallbackDeck(topic, slideCount = null, theme = 'dark_modern') {
    const cleanTopic = (topic || 'Strategic Architecture').trim();
    const count = Math.min(20, Math.max(5, (slideCount && !isNaN(slideCount)) ? parseInt(slideCount, 10) : 5));
    const deckTitle = `${cleanTopic}: Executive Masterclass`;

    // 20 Comprehensive, Domain-Grounded Slide Blueprints
    const masterSlides = [
        {
            slide_number: 1,
            layout_type: 'title_hero',
            category: 'EXECUTIVE BRIEFING',
            title: `Strategic Masterclass: ${cleanTopic}`,
            subtitle: 'Executive architecture, operational imperatives, and market dynamics',
            objective: `Deliver an authoritative, end-to-end strategic briefing on ${cleanTopic} for cross-functional leadership.`,
            bullets: [
                `**Strategic Intent**: High-level vision outlining the transformative roadmap, architectural requirements, and expected deliverables for ${cleanTopic}.`,
                '**Target Audience**: Designed for cross-functional stakeholders, engineering directors, and executive leadership demanding technical depth.',
                '**Presentation Standard**: Created with ShiviAI • Executive Keynote Widescreen Edition'
            ],
            image_search_query: `${cleanTopic} executive briefing room modern enterprise headquarters`,
            visual_description: `Modern executive command briefing room with high-definition digital displays showcasing ${cleanTopic} operational data, cinematic corporate lighting`,
            image_prompt: `Modern executive command briefing room with high-definition digital displays showcasing ${cleanTopic} operational data, cinematic corporate lighting, documentary photography, 4k`
        },
        {
            slide_number: 2,
            layout_type: 'split_image_content',
            category: 'STRATEGIC OBJECTIVE',
            title: 'Core Objectives & System Bottlenecks',
            subtitle: 'Navigating primary catalysts and resolving structural bottlenecks',
            objective: 'Define measurable milestones and overcome existing structural bottlenecks across systems.',
            bullets: [
                '**Operational Efficiency**: Eliminating redundant manual workflows to reduce cycle times by up to 35% through orchestrated pipelines.',
                '**System Reliability**: Implementing end-to-end telemetry and automated verification guardrails to safeguard uptime and prevent failovers.',
                '**Scalable Architecture**: Decoupling interdependent layers to ensure modular flexibility as compute demands and data density expand.'
            ],
            image_search_query: `${cleanTopic} mission critical operations center telemetry dashboards`,
            visual_description: `High-tech mission control room with engineers analyzing telemetry monitors and real-time operational status of ${cleanTopic}`,
            image_prompt: `High-tech mission control room with engineers analyzing telemetry monitors and real-time operational status of ${cleanTopic}, realistic ambient lighting, documentary photography, 4k`
        },
        {
            slide_number: 3,
            layout_type: 'split_image_content',
            category: 'HISTORICAL EVOLUTION',
            title: 'Evolutionary Drivers & Paradigm Trajectory',
            subtitle: 'From legacy methodologies to autonomous, high-throughput systems',
            objective: 'Trace generational paradigm shifts establishing modern domain standards.',
            bullets: [
                '**Foundational Precedents**: Early monolithic implementations established domain feasibility but suffered severe horizontal scaling friction.',
                '**Decoupled Modernization**: Transition toward distributed micro-services eliminated single points of computational failure.',
                '**Autonomous Convergence**: Current state-of-the-art leverages machine-speed feedback loops and predictive heuristics.'
            ],
            image_search_query: `${cleanTopic} technical engineering laboratory hardware evolution`,
            visual_description: `Clean technical laboratory displaying the physical evolution of engineering hardware for ${cleanTopic}`,
            image_prompt: `Clean technical laboratory displaying the physical evolution of engineering hardware for ${cleanTopic}, macro photography, studio lighting, hyper-detailed`
        },
        {
            slide_number: 4,
            layout_type: 'split_image_content',
            category: 'SYSTEM ARCHITECTURE',
            title: 'Core Architecture & Technical Topology',
            subtitle: 'Underlying invariants, execution paths, and fault-tolerant topologies',
            objective: 'Demystify the foundational mechanics driving deterministic performance in production.',
            bullets: [
                '**Decoupled Orchestration**: Distributed state machines isolate computational stages to maintain deterministic latency boundaries across concurrent threads.',
                '**Autonomous Telemetry**: Continuous observability agents monitor throughput gradients and dynamically rebalance cluster workloads in real time.',
                '**Fault Isolation**: Partitioning critical services prevents cascading node degradation and ensures resilient, non-blocking fallback mechanisms.'
            ],
            image_search_query: `${cleanTopic} enterprise datacenter server corridor fiber-optic cabling`,
            visual_description: `Enterprise datacenter server corridor with glowing cable management and high-density compute blades for ${cleanTopic}`,
            image_prompt: `Enterprise datacenter server corridor with glowing cable management and high-density compute blades for ${cleanTopic}, realistic lighting, documentary photography, 4k`
        },
        {
            slide_number: 5,
            layout_type: 'split_image_content',
            category: 'HARDWARE & COMPUTE',
            title: 'Hardware Topology & Compute Substrates',
            subtitle: 'Provisioning resilient node capacity, bare-metal clusters, and bandwidth',
            objective: 'Specify physical infrastructure requirements supporting production workloads.',
            bullets: [
                '**Compute Acceleration**: Utilizing specialized accelerator clusters to compress training and execution latency curves by over 60%.',
                '**Memory Bandwidth**: High-throughput interconnect fabrics eliminate memory bottlenecks during intensive concurrent analytical queries.',
                '**Thermal Management**: Precision cooling infrastructure preserves sustained peak clock speeds across dense computational chassis.'
            ],
            image_search_query: `${cleanTopic} semiconductor cleanroom processor microchip inspection`,
            visual_description: `Semiconductor cleanroom technician inspecting silicon processor wafer and compute hardware for ${cleanTopic}`,
            image_prompt: `Semiconductor cleanroom technician inspecting silicon processor wafer and compute hardware for ${cleanTopic}, clean sharp focus, editorial photography, 4k`
        },
        {
            slide_number: 6,
            layout_type: 'split_image_content',
            category: 'DATA TOPOLOGY',
            title: 'Data Ingestion & Event Stream Topology',
            subtitle: 'Real-time telemetry, asynchronous brokers, and immutable ledgers',
            objective: 'Establish high-throughput data processing pipelines with zero data loss.',
            bullets: [
                '**Streaming Backpressure**: Reactive event brokers dynamically throttle ingestion rates to shield downstream storage engines from spike degradation.',
                '**Schema Enforcement**: Strict serialization contracts reject malformed payloads at the perimeter to preserve pipeline data integrity.',
                '**Immutable Audit Logs**: Append-only transaction journals provide mathematically verifiable audit trails for compliance forensics.'
            ],
            image_search_query: `${cleanTopic} high density fiber optic network patch bay`,
            visual_description: `Macro documentary photograph of high-density fiber-optic network patch bay transmitting data in modern server facility`,
            image_prompt: `Macro documentary photograph of high-density fiber-optic network patch bay transmitting data in modern server facility for ${cleanTopic}, sharp focus, authentic context`
        },
        {
            slide_number: 7,
            layout_type: 'split_image_content',
            category: 'ALGORITHMIC FOUNDATIONS',
            title: 'Algorithmic Models & Mathematical Invariants',
            subtitle: 'Deterministic execution guarantees, state convergence, and optimization',
            objective: 'Detail the algorithmic core governing deterministic decision boundaries.',
            bullets: [
                '**Loss Convergence**: Advanced gradient optimization algorithms ensure rapid parameter convergence while avoiding local suboptimal plateaus.',
                '**Probabilistic Calibration**: Rigorous confidence interval scoring prevents overconfident edge-case predictions during production anomalies.',
                '**Dynamic Tuning**: Adaptive tuning heuristics modulate learning rates dynamically to safeguard training stability.'
            ],
            image_search_query: `${cleanTopic} software engineers whiteboard algorithmic formulations`,
            visual_description: `Software engineers collaborating at glass whiteboard discussing algorithmic formulas for ${cleanTopic}`,
            image_prompt: `Software engineers collaborating at glass whiteboard discussing algorithmic formulas for ${cleanTopic}, authentic startup office, realistic depth of field, 4k`
        },
        {
            slide_number: 8,
            layout_type: 'split_image_content',
            category: 'SECURITY & GOVERNANCE',
            title: 'Security Posture & Cryptographic Boundaries',
            subtitle: 'Mutual TLS, principle of least privilege, and real-time defense',
            objective: 'Establish bulletproof perimeter defense and zero-trust authentication.',
            bullets: [
                '**Cryptographic Identity**: Ephemeral mutual TLS tokens authenticate inter-service requests to eliminate static credential exploitation vectors.',
                '**Least Privilege**: Role-based access boundaries restrict compute nodes to minimum necessary dataset partitions.',
                '**Automated Isolation**: Behavioral anomaly sentinels quarantine compromised worker pods within sub-second detection windows.'
            ],
            image_search_query: `${cleanTopic} cybersecurity operations center analyst console`,
            visual_description: `Cybersecurity operations center analyst working in front of multi-monitor security consoles for ${cleanTopic}`,
            image_prompt: `Cybersecurity operations center analyst working in front of multi-monitor security consoles for ${cleanTopic}, moody office lighting, documentary photography, 4k`
        },
        {
            slide_number: 9,
            layout_type: 'split_image_content',
            category: 'PERFORMANCE BENCHMARKS',
            title: 'Empirical Benchmarks & Throughput Profiles',
            subtitle: 'Quantified latency profiles, scaling thresholds, and stress tolerances',
            objective: 'Validate performance gains against standardized industry baseline metrics.',
            bullets: [
                '**Latency Compression**: Sustained p99 latency reduced from 240ms to 38ms through kernel-bypass networking and memory pooling.',
                '**Concurrent Scaling**: Verified linear throughput scaling up to 100,000 simultaneous concurrent sessions without degradation.',
                '**Resource Footprint**: Memory usage optimization cuts hardware compute expenditures by up to 28% across identical transaction volumes.'
            ],
            image_search_query: `${cleanTopic} electronics laboratory oscilloscope benchmark diagnostic`,
            visual_description: `Electronics testing workbench with digital oscilloscopes and benchmark diagnostic instruments evaluating ${cleanTopic}`,
            image_prompt: `Electronics testing workbench with digital oscilloscopes and benchmark diagnostic instruments evaluating ${cleanTopic}, realistic lighting, documentary photography`
        },
        {
            slide_number: 10,
            layout_type: 'split_image_content',
            category: 'OPERATIONAL GOVERNANCE',
            title: 'Operational Auditing & SLA Enforcement',
            subtitle: 'Automated policy enforcement, compliance tracing, and audit resilience',
            objective: 'Ensure continuous regulatory adherence and transparent service-level compliance.',
            bullets: [
                '**Telemetry Ingestion**: Granular metrics are collected across all compute nodes to generate continuous regulatory compliance evidence.',
                '**Automated Remediation**: Rule-based remediation controllers trigger proactive node recycling prior to threshold breaches.',
                '**Transparent Reporting**: Real-time stakeholder dashboards expose uptime SLA metrics with complete cryptographic verification.'
            ],
            image_search_query: `${cleanTopic} corporate boardroom compliance audit tablets`,
            visual_description: `Corporate leadership team reviewing operational metrics and audit reports on conference table tablets for ${cleanTopic}`,
            image_prompt: `Corporate leadership team reviewing operational metrics and audit reports on conference table tablets for ${cleanTopic}, editorial corporate photo, 4k`
        },
        {
            slide_number: 11,
            layout_type: 'split_image_content',
            category: 'ECOSYSTEM INTEGRATION',
            title: 'API Integrations & Interoperability Mesh',
            subtitle: 'Decoupled contracts, cross-platform adapters, and third-party orchestration',
            objective: 'Enable seamless interoperability with legacy enterprise environments.',
            bullets: [
                '**Schema Translation**: Lightweight translation adapters convert legacy protocols into modern gRPC payloads with sub-millisecond overhead.',
                '**Circuit Breaking**: Distributed circuit breakers isolate third-party upstream outages to prevent cascade deadlocks.',
                '**Developer Ergonomics**: Comprehensive SDK libraries and automated sandbox generation accelerate partner integration timelines.'
            ],
            image_search_query: `${cleanTopic} software developer desk dual monitors code`,
            visual_description: `Software developer desk setup with dual monitors showing code and API integration schemas for ${cleanTopic}`,
            image_prompt: `Software developer desk setup with dual monitors showing code and API integration schemas for ${cleanTopic}, natural daylight, clean sharp focus, authentic context`
        },
        {
            slide_number: 12,
            layout_type: 'split_image_content',
            category: 'INDUSTRY VERTICALS',
            title: 'Vertical Sector Applications & Deployment Profiles',
            subtitle: 'Enterprise healthcare, financial, industrial, and retail operations',
            objective: 'Showcase tailored domain adaptations across diverse market verticals.',
            bullets: [
                '**Financial Systems**: Algorithmic risk profiling models identify anomalous fraudulent transactions in under 12 milliseconds.',
                '**Healthcare Diagnostics**: High-fidelity multimodal ingestion accelerates medical imaging triage without compromising clinical diagnostic rigor.',
                '**Industrial Manufacturing**: Real-time sensor telemetry predicts mechanical component fatigue weeks prior to catastrophic failure.'
            ],
            image_search_query: `${cleanTopic} automated robotic factory floor industrial operations`,
            visual_description: `Modern industrial factory floor with automated robotic manufacturing arms and monitoring screens powered by ${cleanTopic}`,
            image_prompt: `Modern industrial factory floor with automated robotic manufacturing arms and monitoring screens powered by ${cleanTopic}, documentary photography, 4k`
        },
        {
            slide_number: 13,
            layout_type: 'split_image_content',
            category: 'FIELD CASE STUDIES',
            title: 'Production Case Studies & Measured Outcomes',
            subtitle: 'Empirical deployment outcomes, migration friction, and measured gains',
            objective: 'Analyze real-world enterprise deployments and validated return on investment.',
            bullets: [
                '**Enterprise Rollout**: Global financial enterprise successfully migrated 45 legacy pipelines with zero unscheduled downtime.',
                '**Quantified Throughput**: Post-migration telemetry confirmed a 3.4x surge in transactional capacity alongside a 40% compute cost reduction.',
                '**Operator Feedback**: Engineering teams reported a 55% decline in on-call triage alarms following automated self-healing adoption.'
            ],
            image_search_query: `${cleanTopic} engineering technical team project review office`,
            visual_description: `Technical team gathered around monitor reviewing successful live production deployment for ${cleanTopic}`,
            image_prompt: `Technical team gathered around monitor reviewing successful live production deployment for ${cleanTopic}, natural office candid photography, 4k`
        },
        {
            slide_number: 14,
            layout_type: 'split_image_content',
            category: 'TECHNICAL CHALLENGES',
            title: 'Architectural Bottlenecks & Critical Hazards',
            subtitle: 'Concurrency contention, cold-start latency, and state desynchronization',
            objective: 'Identify high-risk architectural failure modes before production scale.',
            bullets: [
                '**Concurrency Contention**: Shared distributed database locks can induce catastrophic cascade starvation under asymmetric traffic spikes.',
                '**Cold-Start Latency**: Initializing heavyweight containerized model instances introduces unacceptable p99 latency spikes if unmitigated.',
                '**State Desynchronization**: Asynchronous replication across geographically separated datacenters risks transient split-brain inconsistencies.'
            ],
            image_search_query: `${cleanTopic} systems engineer diagnostic laptop server aisle`,
            visual_description: `Systems engineer with diagnostic laptop in server aisle debugging technical performance logs for ${cleanTopic}`,
            image_prompt: `Systems engineer with diagnostic laptop in server aisle debugging technical performance logs for ${cleanTopic}, realistic lighting, documentary photography`
        },
        {
            slide_number: 15,
            layout_type: 'split_image_content',
            category: 'RESILIENCE ENGINEERING',
            title: 'Risk Mitigation & Disaster Recovery',
            subtitle: 'Automated self-healing, multi-region replication, and graceful degradation',
            objective: 'Construct defensive architectural guardrails ensuring uninterrupted business continuity.',
            bullets: [
                '**Warm Pooling**: Pre-warmed container instances eliminate cold-start penalties by maintaining idle headroom during predicted spike intervals.',
                '**Chaos Testing**: Automated fault injection simulations continuously validate failover orchestrations against unannounced node terminations.',
                '**Multi-Region Quorum**: Raft-based consensus clusters span three independent availability zones to guarantee uninterrupted quorum availability.'
            ],
            image_search_query: `${cleanTopic} industrial backup power generators datacenter cooling`,
            visual_description: `Industrial redundant power and cooling backup systems at enterprise server facility for ${cleanTopic}`,
            image_prompt: `Industrial redundant power and cooling backup systems at enterprise server facility for ${cleanTopic}, industrial documentary photography, 4k`
        },
        {
            slide_number: 16,
            layout_type: 'split_image_content',
            category: 'CAPITAL EFFICIENCY',
            title: 'Cost Optimization & Total Cost of Ownership',
            subtitle: 'Unit economics, capital allocation efficiency, and infrastructure ROI',
            objective: 'Structure sustainable infrastructure spending with predictable unit economics.',
            bullets: [
                '**Spot Allocation**: Dynamic spot instance harvesting reduces auxiliary compute expenses by up to 52% for fault-tolerant batch workloads.',
                '**Storage Tiering**: Automated data lifecycle rules migrate dormant historical telemetry to cold archival storage automatically.',
                '**Compounding ROI**: Operational leverage allows transaction volume to scale 5x with less than 20% growth in infrastructure spend.'
            ],
            image_search_query: `${cleanTopic} executive reviewing financial cost graphs tablet`,
            visual_description: `Executive reviewing financial analytics and infrastructure cost graphs on modern tablet for ${cleanTopic}`,
            image_prompt: `Executive reviewing financial analytics and infrastructure cost graphs on modern tablet for ${cleanTopic}, sharp focus, editorial photo, 4k`
        },
        {
            slide_number: 17,
            layout_type: 'split_image_content',
            category: 'ORGANIZATIONAL MATURITY',
            title: 'Cross-Functional Enablement & Tiger Teams',
            subtitle: 'Engineering enablement, change management, and operational readiness',
            objective: 'Equip internal engineering talent with requisite domain competencies.',
            bullets: [
                '**Tiger Team Governance**: Dedicated SWAT engineering teams lead pilot implementations and codify organizational architectural playbooks.',
                '**Continuous Upskilling**: Structured technical workshops ensure staff engineers master distributed state management paradigms.',
                '**Internal Platform Hub**: Self-service developer portals streamline deployment onboarding and enforce organizational best practices.'
            ],
            image_search_query: `${cleanTopic} engineering teams collaborative technical classroom`,
            visual_description: `Engineering teams in modern collaborative tech classroom participating in technical training for ${cleanTopic}`,
            image_prompt: `Engineering teams in modern collaborative tech classroom participating in technical training for ${cleanTopic}, natural lighting, candid documentary photography`
        },
        {
            slide_number: 18,
            layout_type: 'split_image_content',
            category: 'EXECUTION TIMELINE',
            title: 'Implementation Roadmap: Multi-Stage Horizons',
            subtitle: 'Disciplined execution roadmap from discovery to autonomous scale',
            objective: 'Establish a phased rollout timeline with clear accountability gates.',
            bullets: [
                '**Phase 1 Kickoff (Weeks 1-4)**: Audit infrastructure baselines, establish telemetry probes, and assemble a cross-functional Tiger Team.',
                '**Phase 2 Orchestration (Weeks 5-10)**: Deploy unified pipelines into staging, execute load simulations, and conduct operator training.',
                '**Phase 3 Production Scale (Weeks 11+)**: Greenlight enterprise rollout with automated SLA compliance tracking and executive reporting.'
            ],
            image_search_query: `${cleanTopic} technical project roadmap planning wall kanban`,
            visual_description: `Technical project managers and engineers collaborating at project roadmap planning wall for ${cleanTopic}`,
            image_prompt: `Technical project managers and engineers collaborating at project roadmap planning wall for ${cleanTopic}, realistic lighting, documentary photography, 4k`
        },
        {
            slide_number: 19,
            layout_type: 'split_image_content',
            category: 'FUTURE HORIZON',
            title: 'Next-Generation Horizons & Emerging Catalysts',
            subtitle: 'Anticipated technical breakthroughs, paradigm evolution, and moats',
            objective: 'Anticipate upcoming technological inflection points over a 3-5 year horizon.',
            bullets: [
                '**Autonomous Agents**: Transition from reactive pipelines toward goal-directed autonomous agents operating within strict guardrails.',
                '**Edge Compute Convergence**: Sub-millisecond localized inference capabilities shift computation closer to physical edge telemetry sources.',
                '**Strategic Defensibility**: Establishing proprietary operational datasets creates compounding organizational competitive advantages.'
            ],
            image_search_query: `${cleanTopic} scientist research laboratory next-generation computing hardware`,
            visual_description: `Scientist in clean modern research laboratory working on next-generation computing hardware for ${cleanTopic}`,
            image_prompt: `Scientist in clean modern research laboratory working on next-generation computing hardware for ${cleanTopic}, realistic lighting, editorial photography, 4k`
        },
        {
            slide_number: 20,
            layout_type: 'split_image_content',
            category: 'STRATEGIC MANDATE',
            title: 'Executive Mandate & Actionable Next Steps',
            subtitle: 'Leadership directives, capital deployment decisions, and next steps',
            objective: 'Deliver decisive executive takeaways and immediate organizational directives.',
            bullets: [
                '**Immediate Mandate**: Greenlight Phase 1 foundational audit and charter the core implementation Tiger Team within 10 business days.',
                '**Capital Allocation**: Earmark primary infrastructure budget to upgrade high-throughput telemetry pipelines and security perimeters.',
                '**Sustained Momentum**: Establish bi-weekly executive steering reviews to guarantee milestone adherence and unblock dependencies.'
            ],
            image_search_query: `${cleanTopic} executive boardroom meeting strategic agreement handshake`,
            visual_description: `Executive boardroom meeting with corporate leaders finalizing strategic agreement for ${cleanTopic}`,
            image_prompt: `Executive boardroom meeting with corporate leaders finalizing strategic agreement for ${cleanTopic}, cinematic corporate lighting, documentary photography, 4k`
        }
    ];

    let chosenSlides = [];
    if (count <= 5) {
        chosenSlides = [masterSlides[0], masterSlides[1], masterSlides[3], masterSlides[11], masterSlides[19]];
    } else if (count >= 20) {
        chosenSlides = masterSlides.slice(0, 20);
    } else {
        // Pick count - 1 content slides and finish with the final mandate slide
        chosenSlides = masterSlides.slice(0, count - 1);
        chosenSlides.push(masterSlides[19]);
    }

    chosenSlides.forEach((s, idx) => {
        s.slide_number = idx + 1;
    });

    return normalizePresentationDeck({
        deck_title: deckTitle,
        topic: cleanTopic,
        theme: theme,
        slides: chosenSlides
    }, cleanTopic, count);
}

function getSlideChunks(totalCount) {
    if (totalCount <= 6) {
        return [{ start: 1, end: totalCount }];
    }
    if (totalCount <= 10) {
        const mid = Math.ceil(totalCount / 2);
        return [
            { start: 1, end: mid },
            { start: mid + 1, end: totalCount }
        ];
    }
    if (totalCount <= 15) {
        return [
            { start: 1, end: 5 },
            { start: 6, end: 10 },
            { start: 11, end: totalCount }
        ];
    }
    return [
        { start: 1, end: 5 },
        { start: 6, end: 10 },
        { start: 11, end: 15 },
        { start: 16, end: totalCount }
    ];
}

function buildChunkPrompt(chunk, totalCount, cleanTopic) {
    const isFirstChunk = chunk.start === 1;
    const isFinalChunk = chunk.end === totalCount;
    const countInChunk = chunk.end - chunk.start + 1;

    let roleDescription = '';
    if (isFirstChunk && isFinalChunk) {
        roleDescription = `
- Slide 1: layout "title_hero", category "EXECUTIVE SUMMARY" (Authoritative Presentation Masterclass Title, 1-line scope subtitle, strategic intent).
- Slide 2: layout "split_image_content", category "STRATEGIC OBJECTIVE" (Core Objectives, System Bottlenecks, Key Catalysts).
- Slides 3 to ${totalCount - 1}: layout "split_image_content" (Deep-dive technical pillars: Architecture, Mechanisms, Data Topology, Performance).
- Slide ${totalCount}: layout "split_image_content", category "STRATEGIC ROADMAP" (Phased Implementation Roadmap & Leadership Mandate).`;
    } else if (isFirstChunk) {
        roleDescription = `
- Slide 1: layout "title_hero", category "EXECUTIVE SUMMARY" (Authoritative Presentation Masterclass Title, 1-line scope subtitle, strategic intent).
- Slide 2: layout "split_image_content", category "STRATEGIC OBJECTIVE" (Core Objectives, System Bottlenecks, Key Catalysts).
- Slides 3 to ${chunk.end}: layout "split_image_content" (Deep-dive technical pillars: Architectural Foundation, Hardware/Compute Topology, Core Mechanics).`;
    } else if (isFinalChunk) {
        roleDescription = `
- Slides ${chunk.start} to ${totalCount - 1}: layout "split_image_content" (Advanced Deep Pillars: Security & Governance, Ecosystem Integrations, Unit Economics & ROI, Empirical Case Studies).
- Slide ${totalCount}: layout "split_image_content", category "STRATEGIC ROADMAP" (Phased Implementation Roadmap, Actionable Milestones & Leadership Mandate).`;
    } else {
        roleDescription = `
- Slides ${chunk.start} to ${chunk.end}: layout "split_image_content" (Advanced Pillars: Scalability Patterns, Telemetry, Latency Optimization, Edge Computing, Fault-Tolerance & Resilience).`;
    }

    const layoutStr = isFirstChunk ? 'title_hero' : 'split_image_content';
    const catStr = isFirstChunk ? 'EXECUTIVE SUMMARY' : 'CORE PILLAR';

    return `You are an elite executive presentation designer and subject matter expert.
Generate a high-yield, structured presentation for the given topic.
You MUST output ONLY a valid JSON object matching the schema below. No markdown backticks (\`\`\`json), no chat conversational fluff.

CRITICAL RULES:
1. NEVER repeat the slide title, deck title, or topic name inside the 'bullets' array.
2. Every content slide MUST contain 3 to 4 analytical, informative bullet points.
3. Each bullet point MUST be 15 to 25 words long, starting with a bold keyword concept: "**Concept**: Explanation with real metrics, implementation steps, or technical facts."
4. IMAGE PROMPT SPECIFICITY: For every slide, provide an 'image_prompt' that describes a concrete, photographic real-world scene directly tied to that slide's specific sub-topic (avoid abstract shapes, metaphors, or generic keywords).

JSON SCHEMA:
{
  "deck_title": "${cleanTopic}: Executive Masterclass",
  "topic": "${cleanTopic}",
  "slides": [
    {
      "slide_number": ${chunk.start},
      "layout": "${layoutStr}",
      "category": "${catStr}",
      "title": "String - Clear, professional slide title",
      "subtitle": "String - One-line contextual summary",
      "objective": "String - Core objective of this slide",
      "bullets": [
        "**Core Foundation**: Clear explanation of fundamental principles with 15-25 words of factual context.",
        "**Strategic Alignment**: Deep analysis of operational impact and organizational relevance.",
        "**Implementation Scope**: Concrete overview of timeline milestones and expected efficiency improvements."
      ],
      "image_prompt": "Specific photographic description of real equipment, workflow, or workspace matching this slide, realistic lighting, 8k"
    }
  ]
}

### SLIDE ROLES FOR THIS BATCH:
${roleDescription}

Generate exactly ${countInChunk} slides numbered ${chunk.start} through ${chunk.end} of ${totalCount}. Output ONLY raw JSON.`;
}

async function buildPresentationDeck(topic, slideCount = null, theme = 'dark_modern', keys = {}) {
    const cleanTopic = String(topic || 'Topic Deep-Dive').trim();
    const totalCount = Math.min(20, Math.max(5, (slideCount && !isNaN(slideCount)) ? parseInt(slideCount, 10) : 8));

    const systemPrompt = `You are an elite executive presentation designer and subject matter expert. Generate a high-yield, structured presentation for the given topic. You MUST output ONLY a valid JSON object matching the schema. No markdown backticks (\`\`\`json), no chat conversational fluff. CRITICAL RULES: 1. NEVER repeat the slide title, deck title, or topic name inside the 'bullets' array. 2. Every content slide MUST contain 3 to 4 analytical, informative bullet points. 3. Each bullet point MUST be 15 to 25 words long, starting with a bold keyword concept: "**Concept**: Explanation with real metrics, implementation steps, or technical facts." 4. IMAGE PROMPT SPECIFICITY: For every slide, provide an 'image_prompt' that describes a concrete, photographic real-world scene directly tied to that slide's specific sub-topic (avoid abstract shapes, metaphors, or generic keywords). Output ONLY valid raw JSON.`;

    // Helper to query LLM providers with resilient fallback
    async function executeLlmPrompt(currentPrompt) {
        const providerCalls = [];
        if (keys.groq) {
            providerCalls.push(() => callGroq(keys.groq, 'openai/gpt-oss-120b', systemPrompt, currentPrompt, [], { max_tokens: 2500 }));
            providerCalls.push(() => callGroq(keys.groq, 'openai/gpt-oss-20b', systemPrompt, currentPrompt, [], { max_tokens: 2500 }));
            providerCalls.push(() => callGroq(keys.groq, 'qwen/qwen3.8-27b', systemPrompt, currentPrompt, [], { max_tokens: 950 }));
        }
        if (keys.gemini) {
            providerCalls.push(() => callGemini(keys.gemini, 'gemini-1.5-flash', systemPrompt, currentPrompt, [], { max_tokens: 8192 }));
        }
        if (keys.openai) {
            providerCalls.push(() => callOpenAI(keys.openai, 'gpt-4o-mini', systemPrompt, currentPrompt, [], { max_tokens: 8192 }));
        }
        if (keys.openrouter) {
            providerCalls.push(() => callOpenRouter(keys.openrouter, 'google/gemini-2.0-flash-exp:free', systemPrompt, currentPrompt, [], { max_tokens: 8192 }));
        }

        for (const callFn of providerCalls) {
            try {
                const responseText = await callFn();
                if (responseText && responseText.trim()) {
                    const parsed = repairTruncatedJson(responseText);
                    if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn('[Deck Generator LLM Provider Warning]:', e.message);
            }
        }
        return null;
    }

    // Dynamic Chunking for Zero Token Truncation (Max 5 slides per chunk)
    const chunks = getSlideChunks(totalCount);
    const chunkPromises = chunks.map(chunk => executeLlmPrompt(buildChunkPrompt(chunk, totalCount, cleanTopic)));
    const chunkResults = await Promise.all(chunkPromises);

    const combinedSlides = [];
    let deckTitle = `${cleanTopic}: Executive Masterclass`;

    chunkResults.forEach((deckResult) => {
        if (deckResult && deckResult.deck_title) {
            deckTitle = deckResult.deck_title;
        }
        if (deckResult && Array.isArray(deckResult.slides)) {
            combinedSlides.push(...deckResult.slides);
        }
    });

    if (combinedSlides.length > 0) {
        const mergedDeck = {
            deck_title: deckTitle,
            topic: cleanTopic,
            theme: theme,
            slides: combinedSlides
        };
        return normalizePresentationDeck(mergedDeck, cleanTopic, totalCount);
    }

    return generateRichFallbackDeck(cleanTopic, totalCount, theme);
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
        // 1. TITLE HERO LAYOUT (Slide 1)
        // -------------------------------------------------------------
        if (idx === 0 || layout === 'title' || layout === 'title_hero') {
            const colW = 5.65;

            // Left Column: Strategic Summary Card
            slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                x: 0.8, y: contentTop, w: colW, h: contentHeight,
                fill: { color: cardBgHex },
                line: { color: cardBorderHex, width: 1 },
                rectRadius: 0.12
            });

            const leftRuns = [];
            const objText = s.objective || `Deliver an authoritative executive briefing on ${normalizedDeck.deck_title}.`;
            leftRuns.push({ text: '🎯 STRATEGIC OBJECTIVE:\n', options: { bold: true, fontSize: 11.5, color: altAccentHex, fontFace: 'Arial' } });
            leftRuns.push({ text: `${objText}\n\n`, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } });

            const bulletsList = (s.bullets && s.bullets.length > 0) ? s.bullets : cards.map(c => `**${c.title || c.label || 'Pillar'}**: ${c.description || c.detail || ''}`);
            bulletsList.slice(0, 3).forEach(bItem => {
                const bStr = String(bItem).trim();
                if (bStr.includes(':')) {
                    const parts = bStr.split(':');
                    const k = parts[0].replace(/\*/g, '').trim();
                    const d = parts.slice(1).join(':').trim();
                    leftRuns.push({ text: `✦ ${k}: `, options: { bold: true, fontSize: 11.5, color: accentHex, fontFace: 'Arial' } });
                    leftRuns.push({ text: `${d}\n\n`, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } });
                } else {
                    leftRuns.push({ text: `✦ ${bStr}\n\n`, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } });
                }
            });

            leftRuns.push({ text: 'Created with ShiviAI • Executive Keynote Widescreen Edition', options: { italic: true, fontSize: 9.5, color: subHex, fontFace: 'Arial' } });

            slide.addText(leftRuns, {
                x: 1.05, y: contentTop + 0.2, w: colW - 0.5, h: contentHeight - 0.4,
                valign: 'top'
            });

            // Right column: AI Generated Visual Image
            const imgPrompt = s.image_prompt || s.visual_prompt || `${normalizedDeck.deck_title} modern corporate executive technology`;
            const safeIndex = parseInt(idx, 10) + 1;
            const seed = safeIndex * 137;
            const imgUrl = (idx === 0 && s.image_url) ? s.image_url : (s.fallback_image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80');

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
        // 2. SPLIT IMAGE & CONTENT LAYOUT (With 3-4 Bullets & Dynamic AI Visual)
        // -------------------------------------------------------------
        else if (layout === 'split_image_content' || s.bullets || s.image_prompt || s.image_url) {
            const colW = 5.65;
            const bulletsList = (s.bullets && s.bullets.length > 0) ? s.bullets : cards.map(c => `**${c.title || c.label || 'Pillar'}**: ${c.description || c.detail || ''}`);
            const numBullets = Math.min(Math.max(bulletsList.length, 2), 4);
            const cardGap = 0.15;
            const cardH = (contentHeight - (cardGap * (numBullets - 1))) / numBullets;

            for (let bIdx = 0; bIdx < numBullets; bIdx++) {
                const bStr = String(bulletsList[bIdx] || bulletsList[bulletsList.length - 1]).trim();
                const cy = contentTop + bIdx * (cardH + cardGap);

                slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
                    x: 0.8, y: cy, w: colW, h: cardH,
                    fill: { color: cardBgHex },
                    line: { color: cardBorderHex, width: 1 },
                    rectRadius: 0.1
                });

                // Left Accent Strip
                slide.addShape(pptx.shapes.RECTANGLE, {
                    x: 0.8, y: cy + 0.08, w: 0.08, h: cardH - 0.16,
                    fill: { color: bIdx % 2 === 0 ? accentHex : altAccentHex },
                    line: { color: bIdx % 2 === 0 ? accentHex : altAccentHex }
                });

                let keyword = `Pillar ${bIdx + 1}`;
                let desc = bStr;
                if (bStr.includes(':')) {
                    const parts = bStr.split(':');
                    keyword = parts[0].replace(/\*/g, '').trim();
                    desc = parts.slice(1).join(':').trim();
                }

                const bulletRuns = [
                    { text: `✦ ${keyword}: `, options: { bold: true, fontSize: 12, color: accentHex, fontFace: 'Arial' } },
                    { text: desc, options: { bold: false, fontSize: 11, color: bodyHex, fontFace: 'Arial' } }
                ];

                slide.addText(bulletRuns, {
                    x: 1.05, y: cy + 0.1, w: colW - 0.35, h: cardH - 0.2,
                    valign: 'middle'
                });
            }

            // Right column: AI Generated Visual Image
            const imgPrompt = s.image_prompt || s.visual_prompt || `${normalizedDeck.deck_title} ${slideTitle}`;
            const safeIndex = parseInt(idx, 10) + 1;
            const seed = safeIndex * 137;
            const imgUrl = (idx === 0 && s.image_url) ? s.image_url : (s.fallback_image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80');

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
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
            mongodb: isMongoConnected(),
            db_status: getConnectionStatus(),
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

            const existing = await storage.findUserByEmail(email);
            if (existing) {
                return sendJson(res, 409, { success: false, error: 'An account with this email already exists. Please sign in.' });
            }

            const salt = crypto.randomBytes(16).toString('hex');
            const passwordHash = hashPassword(password, salt);
            const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
            const newUser = await storage.createUser({
                name: name,
                email: email,
                salt: salt,
                passwordHash: passwordHash,
                avatar: initials,
                plan: 'free'
            });

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

            const user = await storage.findUserByEmail(email);
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
                    settings: user.settings || {},
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

            let user = await storage.findUserByEmail(email);

            if (!user) {
                const salt = crypto.randomBytes(16).toString('hex');
                user = await storage.createUser({
                    name: name,
                    email: email,
                    provider: provider,
                    salt: salt,
                    passwordHash: hashPassword(crypto.randomBytes(32).toString('hex'), salt),
                    avatar: avatar,
                    plan: 'pro'
                });
            } else {
                user = await storage.updateUser(user.id, {
                    name: name || user.name,
                    provider: provider,
                    avatar: avatar || user.avatar
                });
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
                    settings: user.settings || {},
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
            const verified = getAuthenticatedUser(req);
            if (!verified) {
                return sendJson(res, 401, { success: false, error: 'Session expired or invalid token.' });
            }

            const user = await storage.findUserById(verified.sub) || await storage.findUserByEmail(verified.email);
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
                    settings: user.settings || {},
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

    // ----------------------------------------------------
    // API: MONGODB & DATABASE STATUS (GET /api/db/status)
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/db/status') {
        try {
            const health = await storage.getDatabaseHealth();
            return sendJson(res, 200, {
                success: true,
                ...health
            });
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    // ----------------------------------------------------
    // API: USER SETTINGS (GET & POST /api/user/settings)
    // ----------------------------------------------------
    if (pathname === '/api/user/settings') {
        const authUser = getAuthenticatedUser(req);
        if (req.method === 'GET') {
            try {
                if (!authUser) {
                    return sendJson(res, 200, { success: true, settings: {}, mode: 'guest' });
                }
                const user = await storage.findUserById(authUser.sub) || await storage.findUserByEmail(authUser.email);
                return sendJson(res, 200, {
                    success: true,
                    settings: (user && user.settings) || {}
                });
            } catch (err) {
                return sendJson(res, 500, { success: false, error: err.message });
            }
        }
        if (req.method === 'POST') {
            try {
                const body = await parseJsonBody(req);
                const targetId = authUser ? authUser.sub : (body.userId || 'guest');
                const settings = body.settings || body;
                await storage.updateUserSettings(targetId, settings);
                return sendJson(res, 200, { success: true, message: 'Settings saved successfully.' });
            } catch (err) {
                return sendJson(res, 500, { success: false, error: err.message });
            }
        }
    }

    // ----------------------------------------------------
    // API: BATCH SYNC LOCALSTORAGE SESSIONS TO MONGODB (POST /api/chats/sync)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/chats/sync') {
        try {
            const body = await parseJsonBody(req);
            const authUser = getAuthenticatedUser(req);
            const userId = authUser ? authUser.sub : (body.userId || 'guest');
            const userEmail = authUser ? authUser.email : (body.userEmail || '');
            const sessions = Array.isArray(body.sessions) ? body.sessions : [];

            const syncResult = await storage.syncUserSessions(sessions, userId, userEmail);
            return sendJson(res, 200, syncResult);
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    // ----------------------------------------------------
    // API: CHAT SESSIONS & CONVERSATIONS
    // ----------------------------------------------------
    // Append message to session: POST /api/chats/:id/messages
    const msgMatch = pathname.match(/^\/api\/chats\/([^/]+)\/messages$/);
    if (req.method === 'POST' && msgMatch) {
        try {
            const sessionId = decodeURIComponent(msgMatch[1]);
            const body = await parseJsonBody(req);
            const authUser = getAuthenticatedUser(req);
            const userId = authUser ? authUser.sub : (body.userId || 'guest');
            const userEmail = authUser ? authUser.email : (body.userEmail || '');

            const result = await storage.appendMessageToSession(sessionId, body.message || body, userId, userEmail);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    // List all sessions: GET /api/chats or /api/sessions
    if (req.method === 'GET' && (pathname === '/api/chats' || pathname === '/api/sessions')) {
        try {
            const authUser = getAuthenticatedUser(req);
            const queryUserId = parsedUrl.searchParams.get('userId');
            const queryEmail = parsedUrl.searchParams.get('email');

            const userId = authUser ? authUser.sub : (queryUserId || 'guest');
            const userEmail = authUser ? authUser.email : (queryEmail || '');

            const result = await storage.getUserSessions(userId, userEmail);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    // Create or update session: POST /api/chats or /api/sessions
    if (req.method === 'POST' && (pathname === '/api/chats' || pathname === '/api/sessions')) {
        try {
            const body = await parseJsonBody(req);
            const authUser = getAuthenticatedUser(req);
            const userId = authUser ? authUser.sub : (body.userId || 'guest');
            const userEmail = authUser ? authUser.email : (body.userEmail || '');

            const result = await storage.saveOrUpdateSession(body.session || body, userId, userEmail);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    // Single session operations: /api/chats/:id
    const chatMatch = pathname.match(/^\/api\/chats\/([^/]+)$/);
    if (chatMatch) {
        const sessionId = decodeURIComponent(chatMatch[1]);
        if (req.method === 'GET') {
            try {
                const session = await storage.getSessionById(sessionId);
                if (!session) {
                    return sendJson(res, 404, { success: false, error: 'Session not found.' });
                }
                return sendJson(res, 200, { success: true, session });
            } catch (err) {
                return sendJson(res, 500, { success: false, error: err.message });
            }
        }
        if (req.method === 'PUT') {
            try {
                const body = await parseJsonBody(req);
                const authUser = getAuthenticatedUser(req);
                const userId = authUser ? authUser.sub : (body.userId || 'guest');
                const userEmail = authUser ? authUser.email : (body.userEmail || '');

                const updateData = Object.assign({}, body, { id: sessionId });
                const result = await storage.saveOrUpdateSession(updateData, userId, userEmail);
                return sendJson(res, 200, result);
            } catch (err) {
                return sendJson(res, 500, { success: false, error: err.message });
            }
        }
        if (req.method === 'DELETE') {
            try {
                const authUser = getAuthenticatedUser(req);
                const userId = authUser ? authUser.sub : null;
                const result = await storage.deleteUserSession(sessionId, userId);
                return sendJson(res, 200, result);
            } catch (err) {
                return sendJson(res, 500, { success: false, error: err.message });
            }
        }
    }

    // ----------------------------------------------------
    // API: PRESENTATIONS & PPT DECKS (GET /api/decks & DELETE /api/decks/:id)
    // ----------------------------------------------------
    if (req.method === 'GET' && pathname === '/api/decks') {
        try {
            const authUser = getAuthenticatedUser(req);
            const queryUserId = parsedUrl.searchParams.get('userId');
            const queryEmail = parsedUrl.searchParams.get('email');
            const userId = authUser ? authUser.sub : (queryUserId || 'guest');
            const userEmail = authUser ? authUser.email : (queryEmail || '');

            const result = await storage.getUserDecks(userId, userEmail);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
    }

    const deckMatch = pathname.match(/^\/api\/decks\/([^/]+)$/);
    if (req.method === 'DELETE' && deckMatch) {
        try {
            const deckId = decodeURIComponent(deckMatch[1]);
            const result = await storage.deletePptDeck(deckId);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, 500, { success: false, error: err.message });
        }
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

                const seed = Math.floor(Math.random() * 10000000);
                const imageUrl = buildOptimizedImageUrl(cleanPrompt, seed, 1280, 720, 'flux');
                const fallbackUrl = buildFastFallbackImageUrl(cleanPrompt, seed, 1280, 720);

                const replyText = `Here is your generated image for: **"${cleanPrompt}"** ✨\n\n![${cleanPrompt}](${imageUrl})\n\n[📥 Download Image](${imageUrl})`;

                return sendJson(res, 200, {
                    success: true,
                    reply: replyText,
                    isImage: true,
                    imageUrl: imageUrl,
                    fallbackUrl: fallbackUrl,
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
                    slideCount = Math.min(20, Math.max(5, parseInt(slideMatch[1], 10)));
                }

                if (isPptSlash) {
                    topic = userMessage.replace(/^\/(ppt|presentation|slides|deck)\s+/i, '').trim();
                    topic = topic
                        .replace(/(?:^|\s)(?:(\d+)\s*(?:slides?|slide deck)|(?:on|about|for)\s+(\d+)\s*(?:slides?|slide deck))\s*(?:on|about|for)?\s*/gi, ' ')
                        .replace(/\s*(?:on|about|for)?\s*(\d+)\s*(?:slides?|slide deck)\s*$/gi, '')
                        .replace(/^(?:on|about|for)\s+/i, '')
                        .trim();
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

                const authUser = getAuthenticatedUser(req);
                const uId = authUser ? authUser.sub : (body.userId || 'guest');
                const uEmail = authUser ? authUser.email : (body.userEmail || '');
                storage.savePptDeck({
                    title: deck.title || deck.deck_title,
                    topic: topic,
                    theme: 'modern_blue',
                    slideCount: deck.slides.length,
                    filename: fileInfo.filename,
                    downloadUrl: fileInfo.downloadUrl,
                    filePath: fileInfo.filePath,
                    slides: deck.slides,
                    deckData: deck
                }, uId, uEmail, body.sessionId || '').catch(() => {});

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

            if (body.sessionId) {
                const authUser = getAuthenticatedUser(req);
                const uId = authUser ? authUser.sub : (body.userId || 'guest');
                const uEmail = authUser ? authUser.email : (body.userEmail || '');
                storage.appendMessageToSession(body.sessionId, {
                    role: 'user',
                    content: userMessage,
                    attachments: attachments
                }, uId, uEmail).catch(() => {});
                storage.appendMessageToSession(body.sessionId, {
                    role: 'assistant',
                    content: result.reply,
                    provider: result.provider,
                    model: result.model,
                    persona: persona
                }, uId, uEmail).catch(() => {});
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
            const size = body.size || '1280x720';
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
                fallbackUrl: imageResult.fallbackUrl,
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

            const authUser = getAuthenticatedUser(req);
            const uId = authUser ? authUser.sub : (body.userId || 'guest');
            const uEmail = authUser ? authUser.email : (body.userEmail || '');
            storage.savePptDeck({
                title: deck.title || deck.deck_title,
                topic: topic,
                theme: theme,
                slideCount: deck.slides.length,
                filename: fileInfo.filename,
                downloadUrl: fileInfo.downloadUrl,
                filePath: fileInfo.filePath,
                slides: deck.slides,
                deckData: deck
            }, uId, uEmail, body.sessionId || '').catch(() => {});

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
    // API: NEURAL TEXT-TO-SPEECH (POST /api/tts)
    // ----------------------------------------------------
    if (req.method === 'POST' && pathname === '/api/tts') {
        try {
            ENV = loadEnv();
            const body = await parseJsonBody(req);
            const text = (body.text || '').trim();
            const voice = (body.voice || 'nova').replace(/^neural_/, ''); // nova, shimmer, alloy, echo, fable, onyx
            const model = body.model || 'tts-1';
            const apiKey = (body.apiKey || '').trim() || (ENV.OPENAI_API_KEY || '').trim();

            if (!text) {
                return sendJson(res, 400, { success: false, error: 'Text parameter is required for TTS.' });
            }

            // Attempt OpenAI High-Fidelity Audio API if key is present
            if (apiKey) {
                try {
                    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: model,
                            input: text.slice(0, 4096),
                            voice: voice,
                            speed: body.speed || 1.02
                        })
                    });

                    if (ttsRes.ok) {
                        const audioBuffer = await ttsRes.arrayBuffer();
                        res.writeHead(200, {
                            'Content-Type': 'audio/mpeg',
                            'Content-Length': audioBuffer.byteLength,
                            'Cache-Control': 'public, max-age=86400',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(Buffer.from(audioBuffer));
                        return;
                    }

                    const errData = await ttsRes.json().catch(() => ({}));
                    console.warn('[TTS] OpenAI Speech notice:', errData.error ? errData.error.message : ttsRes.status);
                } catch (cloudErr) {
                    console.warn('[TTS] Cloud connection notice:', cloudErr.message);
                }
            }

            // Signal seamless fallback to client Pipeline A (Browser Neural Engine)
            return sendJson(res, 200, {
                success: false,
                fallback: true,
                message: 'Fallback to Pipeline A: High-Definition Natural Browser Voice'
            });

        } catch (err) {
            console.error('[API Error /api/tts]:', err.message);
            return sendJson(res, 200, {
                success: false,
                fallback: true,
                error: err.message
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
            mongoConfigured: !!ENV.MONGO_URI,
            mongoStatus: getConnectionStatus(),
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
            if (body.mongoUri !== undefined) updates.MONGO_URI = body.mongoUri.trim();

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

    // Connect to MongoDB with graceful non-blocking automatic local fallback
    connectDB().then(() => {
        storage.seedLocalUsersToMongo().catch(err => {
            console.warn('[MongoDB] Initial migration notice:', err.message);
        });
    }).catch(err => {
        console.warn('[MongoDB] Startup connection notice:', err.message);
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Shivi AI Server stopped.');
        process.exit(0);
    });
});
