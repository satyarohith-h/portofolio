/**
 * SATYA ROHITH — CINEMATIC SCROLL ANIMATION ENGINE
 * High-performance Canvas rendering of 240-frame sequence
 * Fast two-wave preloading, dynamic nearest-frame resolution,
 * fluid momentum (LERP), and synchronized HUD typography.
 */

(function () {
  'use strict';

  const TOTAL_FRAMES = 240;
  const FRAME_DIR = 'assets/frames/';
  const LERP_FACTOR = 0.22; // Snappy, organic momentum with zero sluggishness

  // DOM Elements
  const heroTrack = document.getElementById('home') || document.querySelector('.hero-scroll-track');
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !heroTrack) return;

  const ctx = canvas.getContext('2d', { alpha: false });

  const hudCenter = document.querySelector('.hero-hud-center');
  const hudBottom = document.querySelector('.hero-hud-bottom');
  const frameCounter = document.getElementById('hud-frame-num');
  const loadIndicator = document.getElementById('frame-load-indicator');
  const loadProgressText = document.getElementById('load-progress-text');
  const fallbackImg = document.getElementById('hero-fallback-img');

  // Animation State
  const frames = new Array(TOTAL_FRAMES + 1);
  const loaded = new Array(TOTAL_FRAMES + 1).fill(false);
  let loadedCount = 0;

  let targetFrame = 1;
  let currentFrame = 1;
  let lastRenderedImg = null;
  let isLoopActive = false;

  function getFrameSrc(index) {
    const padded = String(index).padStart(3, '0');
    return `${FRAME_DIR}ezgif-frame-${padded}.jpg`;
  }

  // Two-Wave Fast Preloading
  function preloadFrames() {
    // 1. Frame 1 for immediate paint
    const img1 = new Image();
    img1.src = getFrameSrc(1);
    img1.onload = () => {
      loaded[1] = true;
      loadedCount++;
      frames[1] = img1;
      renderFrame(1);
    };
    frames[1] = img1;

    function onAnyImageLoad(idx) {
      loaded[idx] = true;
      loadedCount++;
      const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
      if (loadProgressText) {
        loadProgressText.textContent = `SYNCING FRAMES: ${percent}%`;
      }
      if (loadedCount >= 30 && loadIndicator) {
        loadIndicator.classList.add('loaded');
      }
      // If current scroll position is close to this newly loaded frame, repaint immediately
      const activeIdx = Math.round(currentFrame);
      if (Math.abs(activeIdx - idx) <= 2) {
        renderFrame(activeIdx);
      }
    }

    // 2. Wave 1: Keyframes (every 4th frame: 1, 5, 9, 13... 240)
    // Ensures instant responsive animation across the full scroll track within ~150ms
    const keyframes = [];
    for (let i = 1; i <= TOTAL_FRAMES; i += 4) {
      if (i !== 1) keyframes.push(i);
    }

    keyframes.forEach((i) => {
      const img = new Image();
      img.src = getFrameSrc(i);
      img.onload = () => onAnyImageLoad(i);
      img.onerror = () => { loaded[i] = false; };
      frames[i] = img;
    });

    // 3. Wave 2: All remaining intermediate frames in fast continuous batches
    const remaining = [];
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      if (i % 4 !== 1) remaining.push(i);
    }

    let batchStart = 0;
    const CHUNK_SIZE = 16;

    function loadNextRemainingChunk() {
      const chunk = remaining.slice(batchStart, batchStart + CHUNK_SIZE);
      if (chunk.length === 0) return;

      chunk.forEach((i) => {
        const img = new Image();
        img.src = getFrameSrc(i);
        img.onload = () => onAnyImageLoad(i);
        img.onerror = () => { loaded[i] = false; };
        frames[i] = img;
      });

      batchStart += CHUNK_SIZE;
      if (batchStart < remaining.length) {
        setTimeout(loadNextRemainingChunk, 20);
      }
    }

    setTimeout(loadNextRemainingChunk, 40);
  }

  // Find nearest loaded frame so the canvas never flashes black
  function getNearestLoadedFrame(targetIndex) {
    const idx = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(targetIndex)));
    if (loaded[idx] && frames[idx]?.complete && frames[idx]?.naturalWidth > 0) {
      return frames[idx];
    }

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = idx - offset;
      if (prev >= 1 && loaded[prev] && frames[prev]?.complete && frames[prev]?.naturalWidth > 0) {
        return frames[prev];
      }
      const next = idx + offset;
      if (next <= TOTAL_FRAMES && loaded[next] && frames[next]?.complete && frames[next]?.naturalWidth > 0) {
        return frames[next];
      }
    }

    return frames[1];
  }

  // Resize canvas with optimal DPR for smooth 60fps rendering
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    lastRenderedImg = null;
    renderFrame(Math.round(currentFrame));
  }

  // Render a specific frame with cover scaling
  function renderFrame(index) {
    const targetIdx = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(index)));
    const img = getNearestLoadedFrame(targetIdx);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    if (img === lastRenderedImg && !canvas.needsRepaint) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const x = (cw - nw) / 2;
    const y = (ch - nh) * 0.45;

    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, iw, ih, x, y, nw, nh);

    lastRenderedImg = img;
    canvas.needsRepaint = false;

    if (fallbackImg && !fallbackImg.classList.contains('fade-out')) {
      fallbackImg.classList.add('fade-out');
    }

    if (frameCounter) {
      frameCounter.textContent = `FRAME: ${String(targetIdx).padStart(3, '0')}/${TOTAL_FRAMES}`;
    }
  }

  // Calculate scroll progress within hero track
  function getHeroScrollProgress() {
    const rect = heroTrack.getBoundingClientRect();
    const trackHeight = rect.height - window.innerHeight;
    if (trackHeight <= 0) return 0;

    const scrolled = -rect.top;
    return Math.max(0, Math.min(1, scrolled / trackHeight));
  }

  // Synchronize Hero HUD Text with Scroll
  function updateHud(progress) {
    if (!hudCenter) return;

    if (progress < 0.08) {
      hudCenter.style.opacity = '1';
      hudCenter.style.transform = 'translateY(0)';
    } else if (progress >= 0.08 && progress <= 0.85) {
      hudCenter.style.opacity = '1';
      hudCenter.style.transform = `translateY(${Math.sin(progress * Math.PI) * -12}px)`;
    } else {
      const fadeOut = Math.max(0, 1 - (progress - 0.85) / 0.15);
      hudCenter.style.opacity = fadeOut.toFixed(2);
      hudCenter.style.transform = `translateY(${-(progress - 0.85) * 60}px)`;
    }

    if (hudBottom) {
      hudBottom.style.opacity = progress > 0.85 ? '0' : '1';
    }
  }

  // Animation Loop with LERP momentum
  function animationLoop() {
    const diff = targetFrame - currentFrame;

    if (Math.abs(diff) > 0.01) {
      currentFrame += diff * LERP_FACTOR;
    } else {
      currentFrame = targetFrame;
    }

    renderFrame(Math.round(currentFrame));

    if (Math.abs(targetFrame - currentFrame) > 0.01) {
      requestAnimationFrame(animationLoop);
    } else {
      isLoopActive = false;
    }
  }

  // Scroll Handler
  function onScroll() {
    const progress = getHeroScrollProgress();
    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

    updateHud(progress);

    if (!isLoopActive) {
      isLoopActive = true;
      requestAnimationFrame(animationLoop);
    }
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
  }, { passive: true });

  window.addEventListener('scroll', onScroll, { passive: true });

  function init() {
    preloadFrames();
    resizeCanvas();
    onScroll();

    setTimeout(() => {
      if (loadIndicator) loadIndicator.classList.add('loaded');
    }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
