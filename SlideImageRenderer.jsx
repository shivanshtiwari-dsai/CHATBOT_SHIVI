import React, { useState, useEffect } from 'react';

/**
 * SlideImageRenderer
 * Multi-Tier Resilient Image Component for Presentation Studio
 * 
 * Features:
 * - Lazy-loads images on active slide only (eliminates bulk concurrent requests)
 * - Caches loaded image URLs in memory so navigating back does not re-fetch or consume quota
 * - Level 0: Pollinations with turbo model and staggered seed (width=800, height=500)
 * - Level 1: High-res contextual Unsplash source based on slide domain keywords
 * - Level 2: Ultra-safe high-aesthetic tech placeholder (photo-1518770660439-4636190af475)
 * - Detects rate limits / 429 / 500 / broken images and transparently falls back
 */

// Global in-memory cache for loaded slide images across slide navigation
if (typeof window !== 'undefined' && !window._slideImageCache) {
  window._slideImageCache = new Map();
}

export const SlideImageRenderer = ({ slide, topic, index, isActive }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);

  // Extract clean keywords for high-relevance fallback
  const searchKeywords = encodeURIComponent(
    `${slide?.title || slide?.slide_title || ''} ${topic || ''}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 50)
  );

  const cacheKey = `${topic || 'deck'}_slide_${index}`;

  useEffect(() => {
    // Only fetch when the slide becomes active or near-active
    if (!isActive) return;

    // Check memory cache first so navigating back never re-fetches
    if (typeof window !== 'undefined' && window._slideImageCache && window._slideImageCache.has(cacheKey)) {
      setImgSrc(window._slideImageCache.get(cacheKey));
      setLoading(false);
      return;
    }

    // Source hierarchy:
    // Level 0: Pollinations with turbo model and staggered seed
    // Level 1: High-res contextual Unsplash source (No rate limits)
    // Level 2: Clean SVG thematic gradient placeholder / ultra-safe tech photo
    if (errorCount === 0) {
      const prompt = encodeURIComponent(`${slide?.image_prompt || slide?.visual_prompt || slide?.title || 'technology'}, corporate tech, realistic, 8k`);
      setImgSrc(`https://image.pollinations.ai/prompt/${prompt}?width=800&height=500&nologo=true&model=turbo&seed=${index * 137}`);
    } else if (errorCount === 1) {
      // Unsplash source based on slide domain keywords
      setImgSrc(`https://source.unsplash.com/800x500/?${searchKeywords}`);
    } else {
      // Ultra-safe fallback: high aesthetic tech placeholder
      setImgSrc(`https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80`);
    }
  }, [isActive, errorCount, slide, topic, index, searchKeywords, cacheKey]);

  const handleImageError = () => {
    // If Pollinations returns 429, 500, or a broken image, switch immediately to next level
    setErrorCount(prev => prev + 1);
  };

  const handleImageLoad = () => {
    setLoading(false);
    if (imgSrc && typeof window !== 'undefined' && window._slideImageCache) {
      window._slideImageCache.set(cacheKey, imgSrc);
    }
  };

  if (!isActive && !imgSrc) {
    return <div className="w-full h-full bg-slate-900/40 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="relative w-full h-full min-h-[320px] max-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-2xl flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm z-10">
          <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400 mt-2">Loading slide visual...</span>
        </div>
      )}

      {imgSrc && (
        <img
          src={imgSrc}
          alt={slide?.title || slide?.slide_title || "Slide Visual"}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {/* Floating Prompt Pill */}
      {(slide?.image_prompt || slide?.visual_prompt) && (
        <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 truncate">
          <span className="text-cyan-400 font-bold mr-1.5">✦</span>
          {slide.image_prompt || slide.visual_prompt}
        </div>
      )}
    </div>
  );
};

export default SlideImageRenderer;
