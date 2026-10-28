  // =========================================================
  // 2. BACKGROUND VIDEO AND PARALLAX
  // =========================================================

  const bgVideo = document.getElementById('site-bg-video');
  const bgFallback = document.getElementById('site-bg-fallback');

  if (bgVideo) {
    bgVideo.muted = true;
    bgVideo.setAttribute('playsinline', 'true');
    bgVideo.setAttribute('autoplay', 'autoplay');
    bgVideo.style.objectPosition = 'center 32%';

    if (bgFallback) {
      bgFallback.style.display = 'block';
      bgFallback.style.objectPosition = 'center 32%';
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let videoTicking = false;

    function updateBackgroundFraming() {
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const scrollProgress = prefersReducedMotion ? 0 : Math.min(Math.max((window.scrollY || 0) / maxScroll, 0), 1);
      const focalY = 32 + (scrollProgress * 18);

      bgVideo.style.objectPosition = `center ${focalY}%`;

      if (bgFallback) {
        bgFallback.style.objectPosition = `center ${focalY}%`;
      }
    }

    function scheduleBackgroundFraming() {
      if (videoTicking) return;

      videoTicking = true;

      requestAnimationFrame(() => {
        updateBackgroundFraming();
        videoTicking = false;
      });
    }

    bgVideo.play().catch(() => {
      if (bgFallback) {
        bgFallback.style.display = 'block';
      }
    });

    if (!prefersReducedMotion) {
      window.addEventListener('scroll', scheduleBackgroundFraming, { passive: true });
      window.addEventListener('resize', scheduleBackgroundFraming, { passive: true });
    }

    scheduleBackgroundFraming();
  }
