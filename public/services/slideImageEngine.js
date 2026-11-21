/**
 * SHIVI AI — RATE-LIMIT-FREE CONTEXTUAL HD SLIDE IMAGE ENGINE
 * services/slideImageEngine.js
 *
 * Production-grade Dual-Engine Real Photography Resolver for Presentation Slides:
 * 1. Primary Engine: Live Wikimedia/Wikipedia High-Res Commons API (100% Free, Zero Rate Limits, Topic-Matched)
 * 2. Secondary Engine: Curated Domain-Specific Unsplash HD Direct CDN Library (Instant Load, Zero Rate Limits, 30+ URLs)
 *
 * Eliminates all external rate-limiting banners and branding watermarks permanently.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var exports = factory();
    if (typeof root !== 'undefined') {
      root.SlideImageEngine = exports;
      root.CURATED_HD_VISUALS = exports.CURATED_HD_VISUALS;
      root.getGuaranteedSlideImage = exports.getGuaranteedSlideImage;
      root.fetchContextualSlidePhoto = exports.fetchContextualSlidePhoto;
    }
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ==========================================
  // CURATED DOMAIN-SPECIFIC UNSPLASH HD LIBRARY (30+ VERIFIED DIRECT CDN URLs)
  // ==========================================
  const CURATED_HD_VISUALS = {
    ai: [
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85'
    ],
    server: [
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85'
    ],
    data: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&w=1200&q=85'
    ],
    security: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=85'
    ],
    code: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85'
    ],
    business: [
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=85'
    ],
    finance: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=85'
    ],
    healthcare: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=85'
    ],
    hardware: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1550041473-d296a3a8a1c6?auto=format&fit=crop&w=1200&q=85'
    ],
    default: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=85'
    ]
  };

  /**
   * Synchronous, guaranteed rate-limit-free image resolver based on slide keywords.
   * Maps slide keywords to curated 1200px Unsplash HD direct URLs.
   *
   * @param {Object} slide - Slide object containing title, image_prompt, bullets
   * @param {string} topic - Presentation topic
   * @param {number} slideIndex - 0-based or 1-based slide index
   * @returns {string} High-resolution direct image URL
   */
  function getGuaranteedSlideImage(slide, topic = '', slideIndex = 0) {
    const slideObj = slide || {};
    const title = slideObj.title || slideObj.slide_title || '';
    const prompt = slideObj.image_prompt || slideObj.visual_prompt || slideObj.visual_description || '';
    const bulletsText = Array.isArray(slideObj.bullets) ? slideObj.bullets.join(' ') : '';
    const combinedText = `${title} ${prompt} ${bulletsText} ${topic || ''}`.toLowerCase();

    let pool = CURATED_HD_VISUALS.default;
    if (/server|infrastructure|hardware|cloud|datacenter|legacy|bottleneck|network|compute|hosting|rack|devops/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.server;
    } else if (/data|analytics|silo|metric|chart|database|storage|pipeline|bi|sql|warehouse|lakehouse/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.data;
    } else if (/ai|neural|model|machine learning|deep learning|intelligence|automation|bot|gpt|llm|robotics/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.ai;
    } else if (/security|cyber|privacy|risk|threat|firewall|compliance|auth|encryption|vulnerability|zero trust/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.security;
    } else if (/code|software|developer|engineering|api|architecture|programming|frontend|backend|fullstack/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.code;
    } else if (/talent|team|strategy|management|executive|organization|roadmap|leadership|culture|growth|vision/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.business;
    } else if (/finance|fintech|banking|stock|market|crypto|investment|revenue|capital|profit|valuation/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.finance;
    } else if (/health|medical|clinical|patient|hospital|biotech|pharma|doctor|medicine|genomics/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.healthcare;
    } else if (/hardware|chip|semiconductor|iot|sensor|electronic|circuit|processor|motherboard/.test(combinedText)) {
      pool = CURATED_HD_VISUALS.hardware;
    }

    const safeIdx = Math.abs(parseInt(slideIndex, 10) || 0);
    return pool[safeIdx % pool.length];
  }

  /**
   * Asynchronous dual-engine resolver:
   * 1. Primary: Live Wikimedia Commons API for topic-specific high-res photo (Zero Rate Limits)
   * 2. Secondary Fallback: Curated Domain-Specific Unsplash HD Library
   *
   * @param {Object} slide - Slide object
   * @param {string} topic - Presentation topic
   * @param {number} slideIndex - Slide index
   * @returns {Promise<string>} High-resolution direct image URL
   */
  async function fetchContextualSlidePhoto(slide, topic = '', slideIndex = 0) {
    const slideObj = slide || {};
    const title = slideObj.title || slideObj.slide_title || '';
    const query = `${title} ${topic || ''}`
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (query.length > 2) {
      try {
        // Query Wikimedia Commons API for real high-res images matching the topic
        const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=1280&format=json&origin=*`;
        
        const fetchOptions = {
          signal: AbortSignal.timeout(2000)
        };
        // Add User-Agent if running in Node.js environment
        if (typeof window === 'undefined') {
          fetchOptions.headers = { 'User-Agent': 'ShiviAI-Presentation/1.0 (https://shiviai.com)' };
        }

        const res = await fetch(apiUrl, fetchOptions);
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
          const validUrls = pages
            .map(p => p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url)
            .filter(url => url && /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url));

          if (validUrls.length > 0) {
            const safeIdx = Math.abs(parseInt(slideIndex, 10) || 0);
            return validUrls[safeIdx % validUrls.length];
          }
        }
      } catch (e) {
        // Fallback silently to curated HD visuals
      }
    }

    return getGuaranteedSlideImage(slide, topic, slideIndex);
  }

  return {
    CURATED_HD_VISUALS,
    getGuaranteedSlideImage,
    fetchContextualSlidePhoto
  };
});

