  // =========================================================
  // 2. BACKGROUND VIDEO AND PARALLAX
  // =========================================================

  const bgVideo = document.getElementById('site-bg-video');
  const bgFallback = document.getElementById('site-bg-fallback');

  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.setAttribute('playsinline', 'true');
    bgVideo.setAttribute('autoplay', 'autoplay');
    bgVideo.style.objectPosition = 'center 50%';

    if (bgFallback) {
      bgFallback.style.objectPosition = 'center 50%';
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pointerX = 0;
    let pointerY = 0;
    let frameId = null;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function updateBackgroundFraming() {
      const x = 50 + pointerX * 8;
      const y = 50 + pointerY * 8;
      const focalX = clamp(x, 20, 80);
      const focalY = clamp(y, 20, 80);
      const position = `${focalX}% ${focalY}%`;

      bgVideo.style.objectPosition = position;

      if (bgFallback) {
        bgFallback.style.objectPosition = position;
      }
    }

    function handlePointerMove(event) {
      if (prefersReducedMotion) return;
      pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 2;

      if (frameId) return;

      frameId = requestAnimationFrame(() => {
        updateBackgroundFraming();
        frameId = null;
      });
    }

    function activateBackgroundVideo() {
      bgVideo.classList.add('is-active');
      if (bgFallback) {
        bgFallback.classList.add('fade-out');
      }
      bgVideo.play().catch(() => {
        if (bgFallback) {
          bgFallback.classList.remove('fade-out');
        }
      });
    }

    function deactivateBackgroundVideo() {
      bgVideo.pause();
      bgVideo.classList.remove('is-active');
      if (bgFallback) {
        bgFallback.classList.remove('fade-out');
      }
    }

    const videoSection = document.querySelector('[data-video-section="home"]') || document.getElementById('home');

    if (videoSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activateBackgroundVideo();
          } else {
            deactivateBackgroundVideo();
          }
        });
      }, {
        threshold: 0.45,
      });

      observer.observe(videoSection);
    }

    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('resize', updateBackgroundFraming, { passive: true });
    }

    updateBackgroundFraming();
  }
