/**
 * SHIVI AI — REAL-TIME WEB SEARCH AGGREGATOR (liveSearchEngine.js)
 *
 * Production-grade, zero-API-key Multi-Engine Real-Time Web Browsing
 * & Search-Augmented Generation (RAG) pipeline.
 *
 * Parallel live sources (hard 3.5s timeout for ultra-fast chat speed):
 *   1. Google News Live RSS Engine (Breaking news, headlines, sports, finance, events)
 *   2. DuckDuckGo HTML/Lite Live Scraper & Instant Answers (Niche web pages, live facts, general web search)
 *   3. Wikipedia REST API (Factual entity verification & encyclopedic context)
 *   4. Pollinations searchgpt Live Web Model (Built-in real-time web search LLM)
 */

'use strict';

// ==========================================
// QUERY INTENT CLASSIFIER
// ==========================================
const REALTIME_TRIGGER_PATTERNS = [
    // News & breaking events
    /\b(?:latest|breaking|today'?s?|recent|current|live|happening|ongoing|new)\b/i,
    /\b(?:news|headlines|update|updates|announced|announcement|briefing)\b/i,
    // Sports (cricket, football, tennis, etc.)
    /\b(?:score|scores|match|ipl|cricket|football|nba|fifa|world cup|tournament|champion|league|t20|odi|test match|wpl|epl|champions league)\b/i,
    /\b(?:playing xi|man of the match|toss|innings|wicket|goal|penalty|points table|standings)\b/i,
    // Finance, stocks, crypto & markets
    /\b(?:stock|stocks|share|shares|market|sensex|nifty|nasdaq|dow jones|s&p|bitcoin|btc|ethereum|eth|crypto|forex|trading|gold price|silver price|crude oil|brent)\b/i,
    /\b(?:price of|price for|how much is|cost of|rate of|exchange rate|all-time high|ath)\b/i,
    // Weather & environment
    /\b(?:weather|forecast|temperature|rain|humidity|storm|cyclone|heatwave|monsoon|air quality|aqi)\b/i,
    // Time-sensitive facts, elections, winners
    /\b(?:who is the current|who won|who is winning|who is leading|election|results|trending|now)\b/i,
    /\b(?:released|release date|launched|launching|upcoming|next|schedule|scheduled)\b/i,
    // Explicit search requests
    /\b(?:search|google|look up|browse|find out|tell me about|what is happening|what happened)\b/i,
    // Technology, products, releases
    /\b(?:iphone|pixel|samsung|galaxy|tesla|spacex|openai|chatgpt|gemini|deepmind|nvidia|ai model|gpt-5|gpt-4|claude|groq|llama)\b/i,
    // People & positions of power
    /\b(?:president|prime minister|ceo|founder|captain|coach|director|minister|governor|chief justice)\b/i,
    // Temporal anchors
    /\b(?:today|yesterday|this week|this month|this year|202[4-9]|2030)\b/i,
    // Hindi & Hinglish triggers
    /\b(?:aaj|abhi|taza|naya|kya hua|kya chal raha|kya ho raha|kaun jeeta|score kya|kab|kitna|kahan|batao|khabar)\b/i
];

const SKIP_WEB_PATTERNS = [
    // Pure code generation requests
    /^(?:write|code|implement|create|build|fix|debug|refactor)\s+(?:a\s+)?(?:function|class|script|program|component|api|app|regex|sql)/i,
    // Conversational greetings & emotional statements
    /^(?:i feel|i'm feeling|i am feeling|how are you|hello|hi|hey|good morning|good night|thank you|thanks|bye|who are you)/i,
    // Pure math & expressions
    /^(?:calculate|compute|solve|eval|what is \d|\d+\s*[\+\-\*\/\^])/i,
    // Identity questions
    /\b(?:who made you|who created you|who is your creator|tumhe kisne banaya|kaun hai tera creator)\b/i,
    // Specific slash commands
    /^\/(?:image|draw|imagine|pic|art|ppt|presentation|slides|deck)\s+/i
];

/**
 * Determines whether a given user message benefits from live web browsing.
 * @param {string} query
 * @returns {boolean}
 */
function shouldSearchWeb(query) {
    if (!query || typeof query !== 'string' || query.trim().length < 3) return false;
    const clean = query
        .replace(/\[USER ATTACHED DOCUMENTS\][\s\S]*/i, '')
        .trim();

    // Skip patterns take precedence
    if (SKIP_WEB_PATTERNS.some(p => p.test(clean))) return false;

    // Check real-time intent triggers
    if (REALTIME_TRIGGER_PATTERNS.some(p => p.test(clean))) return true;

    // Treat substantive questions as search candidates
    if (clean.length > 30 && /\?$/.test(clean)) return true;

    return false;
}

/**
 * Normalizes query string for external search engines
 * @param {string} raw
 * @returns {string}
 */
function sanitizeSearchQuery(raw) {
    if (!raw) return '';
    return raw
        .replace(/\[USER ATTACHED DOCUMENTS\][\s\S]*/i, '')
        .replace(/[^\w\s\d\-\.\,\?\@\#\$\%]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160); // Cap length to keep query URLs fast and effective
}

// ==========================================
// SOURCE 1: GOOGLE NEWS LIVE RSS ENGINE
// ==========================================
async function fetchGoogleNewsRSS(cleanQuery, timeoutMs = 3000) {
    const snippets = [];
    try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=en-IN&gl=IN&ceid=IN:en`;
        const res = await fetch(rssUrl, { signal: AbortSignal.timeout(timeoutMs) });
        if (res.ok) {
            const xml = await res.text();
            const matches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g)].slice(0, 6);
            matches.forEach(([_, title, pubDate]) => {
                const decodedTitle = title
                    .replace(/<!\[CDATA\[/g, '')
                    .replace(/\]\]>/g, '')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&#39;/g, "'")
                    .trim();
                const cleanDate = pubDate ? pubDate.replace(/\+0000|GMT/g, '').trim() : '';
                if (decodedTitle) {
                    snippets.push(`[LIVE NEWS - ${cleanDate}]: ${decodedTitle}`);
                }
            });
        }
    } catch (_) {
        // Fail silently; parallel sources compensate
    }
    return snippets;
}

// ==========================================
// SOURCE 2: DUCKDUCKGO HTML/LITE SCRAPER & INSTANT ANSWERS
// ==========================================
async function fetchDuckDuckGo(cleanQuery, timeoutMs = 2800) {
    const snippets = [];

    // Attempt 2A: Instant Answer API
    try {
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(Math.min(timeoutMs, 2000)) });
        if (res.ok) {
            const data = await res.json();
            if (data.AbstractText) {
                snippets.push(`[WEB FACT]: ${data.AbstractText} (Source: ${data.AbstractURL || 'DuckDuckGo'})`);
            }
            if (Array.isArray(data.RelatedTopics)) {
                data.RelatedTopics.slice(0, 3).forEach(topic => {
                    if (topic && topic.Text) {
                        snippets.push(`[WEB DETAIL]: ${topic.Text}`);
                    }
                });
            }
        }
    } catch (_) {}

    // Attempt 2B: DuckDuckGo HTML / Lite Live Scraper (for breaking topics where Instant Answer is blank)
    if (snippets.length < 2) {
        try {
            const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
            const resHtml = await fetch(htmlUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                signal: AbortSignal.timeout(timeoutMs)
            });
            if (resHtml.ok) {
                const html = await resHtml.text();
                const snippetMatches = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].slice(0, 4);
                snippetMatches.forEach(m => {
                    const cleanText = m[1]
                        .replace(/<[^>]+>/g, '')
                        .replace(/&quot;/g, '"')
                        .replace(/&amp;/g, '&')
                        .replace(/&#x27;/g, "'")
                        .replace(/&#39;/g, "'")
                        .trim();
                    if (cleanText) {
                        snippets.push(`[WEB SEARCH - DDG]: ${cleanText}`);
                    }
                });
            }
        } catch (_) {}
    }

    return snippets;
}

// ==========================================
// SOURCE 3: WIKIPEDIA REST API
// ==========================================
async function fetchWikipedia(cleanQuery, timeoutMs = 2500) {
    const snippets = [];
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*&srlimit=3`;
        const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(timeoutMs) });
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const topResults = searchData?.query?.search?.slice(0, 2) || [];
            topResults.forEach(item => {
                const cleanSnippet = (item.snippet || '')
                    .replace(/<\/?[^>]+(>|$)/g, '')
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&#39;/g, "'")
                    .trim();
                if (cleanSnippet) {
                    snippets.push(`[ENCYCLOPEDIA CONTEXT - ${item.title}]: ${cleanSnippet}`);
                }
            });
        }
    } catch (_) {}
    return snippets;
}

// ==========================================
// SOURCE 4: POLLINATIONS SEARCHGPT LIVE WEB MODEL
// ==========================================
async function fetchPollinationsSearchGPT(cleanQuery, timeoutMs = 3500) {
    const snippets = [];
    try {
        const sys = 'You are a real-time web search engine. Return the latest facts, live scores, breaking news, or prices. Be concise, dense with facts, and include dates.';
        const pUrl = `https://text.pollinations.ai/${encodeURIComponent(cleanQuery)}?model=searchgpt&system=${encodeURIComponent(sys)}`;
        const res = await fetch(pUrl, { signal: AbortSignal.timeout(timeoutMs) });
        if (res.ok) {
            let text = await res.text();
            try {
                const parsed = JSON.parse(text);
                text = parsed.text || parsed.response || parsed.content || parsed.message || text;
            } catch (_) {}

            if (text && typeof text === 'string' && text.trim().length > 25 && !text.includes('NOT_FOUND')) {
                snippets.push(`[LIVE WEB SYNTHESIS - searchgpt]: ${text.trim().slice(0, 1400)}`);
            }
        }
    } catch (_) {}
    return snippets;
}

// ==========================================
// MAIN AGGREGATOR FUNCTION: getRealTimeWebContext()
// ==========================================
/**
 * Runs 4 parallel live search engines with a strict 3.5-second timeout.
 * Returns a high-density, real-time RAG context block ready for injection.
 *
 * @param {string} userQuery
 * @returns {Promise<string>}
 */
async function getRealTimeWebContext(userQuery) {
    const now = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full',
        timeStyle: 'medium'
    });

    const cleanQuery = sanitizeSearchQuery(userQuery);
    if (!cleanQuery) {
        return `\n[REAL-TIME SYSTEM CLOCK]: ${now}\n`;
    }

    const snippets = [];

    // Run all 4 live web fetchers in parallel for maximum speed
    const results = await Promise.allSettled([
        // SOURCE 1: Google News RSS (Latest Live Headlines & Minute-by-Minute Updates)
        fetchGoogleNewsRSS(cleanQuery, 3000),

        // SOURCE 2: DuckDuckGo HTML/Lite Scraper & Instant Answers
        fetchDuckDuckGo(cleanQuery, 2800),

        // SOURCE 3: Wikipedia Live Summary API for Niche / Factual Queries
        fetchWikipedia(cleanQuery, 2500),

        // SOURCE 4: Pollinations searchgpt Live Web Model
        fetchPollinationsSearchGPT(cleanQuery, 3500)
    ]);

    results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            snippets.push(...res.value);
        }
    });

    if (snippets.length === 0) {
        return `\n[REAL-TIME SYSTEM CLOCK]: ${now}\n`;
    }

    return `
[REAL-TIME LIVE WEB BROWSING RESULTS - Fetched at ${now}]:
${snippets.join('\n')}

[MANDATORY INSTRUCTION]:
1. You have full, unrestricted real-time web browsing access.
2. Use the live data above to answer the user's query with specific dates, latest facts, and current headlines.
3. NEVER say your real-time browsing is "limited" or "in beta". Speak with complete authority using this live data.
`;
}

// Support both CommonJS and ES Modules
module.exports = {
    getRealTimeWebContext,
    shouldSearchWeb,
    fetchGoogleNewsRSS,
    fetchDuckDuckGo,
    fetchWikipedia,
    fetchPollinationsSearchGPT,
    sanitizeSearchQuery
};
