import React, { useState, useEffect } from 'react';
import { getGuaranteedSlideImage, fetchContextualSlidePhoto } from './services/slideImageEngine.js';

/**
 * SlideImageRenderer
 * Rate-Limit-Free Dual-Engine Real Photography Resolver for Presentation Studio
 * 
 * Features:
 * - Completely free of API rate limits and vendor watermarks
 * - Primary Engine: Live Wikimedia Commons API for topic-specific real photographs
 * - Secondary Engine: Curated Domain-Specific Unsplash HD Direct CDN Library
 * - Lazy-loads images on active slide only with in-memory caching
 */

// Global in-memory cache for loaded slide images across slide navigation
if (typeof window !== 'undefined' && !window._slideImageCache) {
  window._slideImageCache = new Map();
}

export const SlideImageRenderer = ({ slide, topic, index, isActive }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);

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

    let isMounted = true;

    // Resolve via Dual-Engine (Wikimedia -> Curated Unsplash HD)
    fetchContextualSlidePhoto(slide, topic, index)
      .then(url => {
        if (isMounted && url) {
          setImgSrc(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          const fallback = getGuaranteedSlideImage(slide, topic, index);
          setImgSrc(fallback);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isActive, slide, topic, index, cacheKey]);

  const handleImageError = () => {
    // Guaranteed instant Unsplash HD fallback on image loading error
    const fallback = getGuaranteedSlideImage(slide, topic, index);
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
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
