/**
 * ShiviAI Professional Computer Vision & Image Generation Engine
 * Model Tuning, Clarity Modifiers & High-Resolution Endpoint Builder
 */

// Banned generic/abstract buzzwords that degrade image fidelity and relevance
const BANNED_ABSTRACT_TERMS = /\b(abstract|surreal|geometric shapes?|neon glow|digital wave|glowing swirls?|3D data visualization|hologram|futuristic background|technology background|digital transformation|innovation concept|business concept|modern technology|artificial intelligence concept|data concept|futuristic city|blockchain network)\b/gi;

/**
 * Automated prompt refiner turning raw or short user prompts into
 * high-detail photorealistic visual descriptions.
 *
 * @param {string} rawPrompt - The raw user input or slide context.
 * @param {string} domainContext - Optional domain prefix (e.g. "Presentation Keynote", "Clinical Suite").
 * @returns {string} Fully enhanced prompt with cinematography & clarity modifiers.
 */
function enhanceImagePrompt(rawPrompt, domainContext = "") {
  if (!rawPrompt) return "";

  // 1. Clean prompt from code/markdown syntax
  let prompt = String(rawPrompt)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[\n\r\t]+/g, " ")
    .replace(BANNED_ABSTRACT_TERMS, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!prompt) prompt = "authentic real-world subject";

  // 2. Append professional cinematography & clarity modifiers
  const clarityModifiers = [
    "hyperrealistic professional 8k photography",
    "sharp focus",
    "studio lighting",
    "award-winning composition",
    "clean cinematic depth of field",
    "ultra high-definition textures",
    "color graded"
  ].join(", ");

  // 3. Enforce context
  let fullPrompt;
  if (domainContext && !prompt.toLowerCase().includes(domainContext.toLowerCase())) {
    fullPrompt = `${domainContext}: ${prompt}`;
  } else {
    fullPrompt = prompt;
  }

  if (!fullPrompt.includes("hyperrealistic professional 8k photography")) {
    fullPrompt = `${fullPrompt}, ${clarityModifiers}`;
  }

  return fullPrompt;
}

/**
 * Builds a high-resolution 1280x720 (16:9 Widescreen HD) Pollinations URL
 * with Flux model for peak clarity and distortion-free rendering.
 *
 * @param {string} rawPrompt - Raw user prompt or slide visual description.
 * @param {number|string} seed - Deterministic seed for cache consistency.
 * @param {number} width - Default 1280 (16:9 HD).
 * @param {number} height - Default 720 (16:9 HD).
 * @param {string} model - Default 'flux' (or 'turbo' for high-speed fallback).
 * @returns {string} Optimized Pollinations AI URL.
 */
function buildOptimizedImageUrl(rawPrompt, seed = 42, width = 1280, height = 720, model = 'flux') {
  const enhanced = enhanceImagePrompt(rawPrompt);
  const safeSeed = Math.abs(parseInt(seed, 10) || 42);
  const targetModel = model === 'turbo' ? 'turbo' : 'flux';

  // High-Resolution 1280x720 16:9 Endpoint with Flux model for peak clarity
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=${width}&height=${height}&model=${targetModel}&nologo=true&enhance=true&quality=high&seed=${safeSeed}`;
}

/**
 * Ultra-fast CDN fallback using Pollinations Turbo (1.2s delivery)
 */
function buildFastFallbackImageUrl(rawPrompt, seed = 42, width = 1280, height = 720) {
  return buildOptimizedImageUrl(rawPrompt, seed, width, height, 'turbo');
}

// Universal module export (Node.js CommonJS & Browser Window)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    enhanceImagePrompt,
    buildOptimizedImageUrl,
    buildFastFallbackImageUrl,
    BANNED_ABSTRACT_TERMS
  };
}

if (typeof window !== 'undefined') {
  window.enhanceImagePrompt = enhanceImagePrompt;
  window.buildOptimizedImageUrl = buildOptimizedImageUrl;
  window.buildFastFallbackImageUrl = buildFastFallbackImageUrl;
}
