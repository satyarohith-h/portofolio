  // =========================================================
  // 2. BACKGROUND VIDEO AND PARALLAX
  // =========================================================

  const bgVideo = document.getElementById('site-bg-video');
  const bgFallback = document.getElementById('site-bg-fallback');

  if (bgVideo) {
    bgVideo.pause();
    bgVideo.currentTime = 0;
    bgVideo.muted = true;
    bgVideo.setAttribute('playsinline', 'true');
    bgVideo.style.display = 'none';

    if (bgFallback) {
      bgFallback.style.display = 'block';
      bgFallback.style.transform = 'translate3d(0, 0, 0) scale(1.04)';
    }

    let videoTicking = false;

    function updateBackgroundParallax() {
      if (videoTicking) return;

      videoTicking = true;

      requestAnimationFrame(() => {
        const offset = (window.scrollY || 0) * 0.08;

        if (bgFallback) {
          bgFallback.style.transform = `translate3d(0, ${offset}px, 0) scale(1.04)`;
        }

        if (bgVideo) {
          bgVideo.style.transform = `translate3d(0, ${offset}px, 0)`;
        }

        videoTicking = false;
      });
    }

    window.addEventListener('scroll', updateBackgroundParallax, { passive: true });
    window.addEventListener('resize', updateBackgroundParallax, { passive: true });
    updateBackgroundParallax();
  }
