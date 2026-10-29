(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initializeBackgroundEffects() {
    const bgVideo = document.getElementById('site-bg-video');
    const fallbackImg = document.getElementById('site-bg-fallback');
    const canvas = document.getElementById('site-bg-canvas');

    if (bgVideo) {
      bgVideo.muted = true;
      bgVideo.loop = true;
      bgVideo.playsInline = true;
      bgVideo.setAttribute('playsinline', 'true');
      bgVideo.setAttribute('webkit-playsinline', 'true');
      bgVideo.style.display = 'block';

      let pointerX = 0;
      let pointerY = 0;
      let frameId = null;

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      function updateBackgroundFraming() {
        const x = 50 + pointerX * 8;
        const y = 50 + pointerY * 8;
        const focalX = clamp(x, 20, 80);
        const focalY = clamp(y, 20, 80);
        const position = `${focalX}% ${focalY}%`;

        bgVideo.style.objectPosition = position;
        if (fallbackImg) {
          fallbackImg.style.objectPosition = position;
        }
      }

      function showFallback() {
        if (fallbackImg) fallbackImg.classList.remove('fade-out');
      }

      function hideFallback() {
        if (fallbackImg) fallbackImg.classList.add('fade-out');
      }

      function tryPlayVideo() {
        if (!bgVideo || !bgVideo.play) return;

        const playPromise = bgVideo.play();

        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(() => {
            bgVideo.style.display = 'block';
            hideFallback();
          }).catch(() => {
            showFallback();

            const resumePlayback = () => {
              bgVideo.play().catch(() => {});
              window.removeEventListener('pointerdown', resumePlayback);
              window.removeEventListener('touchstart', resumePlayback);
              window.removeEventListener('keydown', resumePlayback);
              window.removeEventListener('scroll', resumePlayback, { passive: true });
            };

            window.addEventListener('pointerdown', resumePlayback, { passive: true });
            window.addEventListener('touchstart', resumePlayback, { passive: true });
            window.addEventListener('keydown', resumePlayback);
            window.addEventListener('scroll', resumePlayback, { passive: true });
          });
        } else {
          bgVideo.style.display = 'block';
          hideFallback();
        }
      }

      if (bgVideo.readyState >= 2) {
        tryPlayVideo();
      } else {
        bgVideo.addEventListener('loadeddata', tryPlayVideo, { once: true });
      }

      bgVideo.addEventListener('error', () => {
        showFallback();
      }, { once: true });

      function handlePointerMove(event) {
        if (reducedMotion.matches) return;
        pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
        pointerY = (event.clientY / window.innerHeight - 0.5) * 2;

        if (frameId) return;

        frameId = requestAnimationFrame(() => {
          updateBackgroundFraming();
          frameId = null;
        });
      }

      function updateScrollParallax() {
        const offset = (window.scrollY || 0) * 0.05;
        bgVideo.style.transform = `translate3d(0, ${offset}px, 0)`;
      }

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('resize', updateBackgroundFraming, { passive: true });
      window.addEventListener('scroll', () => {
        updateBackgroundFraming();
        updateScrollParallax();
      }, { passive: true });

      updateBackgroundFraming();
      updateScrollParallax();
    }

    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const mouse = { x: -1000, y: -1000, active: false };
        let width = 0;
        let height = 0;
        let particles = [];
        let animationFrame = null;
        let lastFrame = 0;
        let scrollY = window.scrollY || 0;

        const connectionDistance = 125;
        const particleColor = '255, 75, 55';

        function resizeCanvas() {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          width = window.innerWidth;
          height = window.innerHeight;

          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          const particleCount = Math.min(100, Math.max(24, Math.floor((width * height) / 16000)));
          particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: Math.random() * 1.7 + 0.6,
            alpha: Math.random() * 0.45 + 0.2
          }));
        }

        function drawMouseGlow() {
          if (!mouse.active) return;

          const gradient = ctx.createRadialGradient(
            mouse.x, mouse.y, 0,
            mouse.x, mouse.y, Math.min(width, height) * 0.28
          );

          gradient.addColorStop(0, 'rgba(255, 65, 45, 0.14)');
          gradient.addColorStop(0.35, 'rgba(255, 45, 25, 0.055)');
          gradient.addColorStop(1, 'rgba(255, 45, 25, 0)');

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }

        function drawParticles() {
          const scrollOffset = (scrollY * 0.025) % (height || 1);

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (!reducedMotion.matches) {
              p.x += p.vx;
              p.y += p.vy;

              if (mouse.active) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 115 && distance > 0) {
                  const force = (115 - distance) / 115;
                  p.x += (dx / distance) * force * 0.7;
                  p.y += (dy / distance) * force * 0.7;
                }
              }

              if (p.x < -5) p.x = width + 5;
              if (p.x > width + 5) p.x = -5;
              if (p.y < -5) p.y = height + 5;
              if (p.y > height + 5) p.y = -5;
            }

            const drawY = (p.y - scrollOffset + height) % height;

            ctx.beginPath();
            ctx.arc(p.x, drawY, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleColor}, ${p.alpha})`;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
              const other = particles[j];
              const otherY = (other.y - scrollOffset + height) % height;
              const dx = p.x - other.x;
              const dy = drawY - otherY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < connectionDistance) {
                const opacity = (1 - distance / connectionDistance) * 0.16;

                ctx.beginPath();
                ctx.moveTo(p.x, drawY);
                ctx.lineTo(other.x, otherY);
                ctx.strokeStyle = `rgba(${particleColor}, ${opacity})`;
                ctx.lineWidth = 0.7;
                ctx.stroke();
              }
            }
          }
        }

        function renderBackground(time) {
          if (reducedMotion.matches) {
            ctx.clearRect(0, 0, width, height);
            drawMouseGlow();
            drawParticles();
            return;
          }

          if (time - lastFrame < 15) {
            animationFrame = requestAnimationFrame(renderBackground);
            return;
          }

          lastFrame = time;
          ctx.clearRect(0, 0, width, height);
          drawMouseGlow();
          drawParticles();

          animationFrame = requestAnimationFrame(renderBackground);
        }

        function startAnimation() {
          if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
          }

          lastFrame = 0;
          animationFrame = requestAnimationFrame(renderBackground);
        }

        window.addEventListener('pointermove', (event) => {
          mouse.x = event.clientX;
          mouse.y = event.clientY;
          mouse.active = true;
        }, { passive: true });

        window.addEventListener('pointerleave', () => {
          mouse.active = false;
        }, { passive: true });

        window.addEventListener('blur', () => {
          mouse.active = false;
        });

        window.addEventListener('scroll', () => {
          scrollY = window.scrollY || 0;
        }, { passive: true });

        window.addEventListener('resize', () => {
          resizeCanvas();
        }, { passive: true });

        if (reducedMotion.addEventListener) {
          reducedMotion.addEventListener('change', startAnimation);
        }

        resizeCanvas();
        startAnimation();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBackgroundEffects, { once: true });
  } else {
    initializeBackgroundEffects();
  }
})();
