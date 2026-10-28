(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initializeBackgroundEffects() {
    const rootState = window.__portfolioBackgroundState || (window.__portfolioBackgroundState = {});

    if (rootState.effectsInitialized) {
      return;
    }

    rootState.effectsInitialized = true;

    // =========================================================
    // 1. SCROLL PROGRESS, HEADER & BACK TO TOP
    // =========================================================

    const progressBar = document.getElementById('scroll-progress-bar');
    const siteHeader = document.querySelector('.site-header');
    const backToTopBtn = document.getElementById('back-to-top');

    function updateScrollMetrics() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      if (progressBar) progressBar.style.width = `${progress}%`;

      if (siteHeader) {
        siteHeader.classList.toggle('scrolled', scrollTop > 60);
      }

      if (backToTopBtn) {
        backToTopBtn.classList.toggle('visible', scrollTop > 450);
      }

      document.documentElement.style.setProperty(
        '--scroll-progress',
        `${progress}%`
      );
    }

    window.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics, { passive: true });
    updateScrollMetrics();

    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // =========================================================
    // 2. BACKGROUND VIDEO AND PARALLAX
    // =========================================================

    const bgVideo = document.getElementById('site-bg-video');
    const fallbackImg = document.getElementById('site-bg-fallback');

    if (bgVideo) {
      bgVideo.muted = true;
      bgVideo.loop = true;
      bgVideo.playsInline = true;
      bgVideo.setAttribute('playsinline', 'true');
      bgVideo.setAttribute('webkit-playsinline', 'true');
      bgVideo.style.display = 'block';

      const showFallback = () => {
        if (fallbackImg) {
          fallbackImg.classList.remove('fade-out');
        }
      };

      const hideFallback = () => {
        if (fallbackImg) {
          fallbackImg.classList.add('fade-out');
        }
      };

      const tryPlayVideo = () => {
        if (!bgVideo || !bgVideo.play) return;

        const playPromise = bgVideo.play();

        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              bgVideo.style.display = 'block';
              hideFallback();
            })
            .catch(() => {
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
      };

      if (bgVideo.readyState >= 2) {
        tryPlayVideo();
      } else {
        bgVideo.addEventListener('loadeddata', tryPlayVideo, { once: true });
      }

      bgVideo.addEventListener('error', () => {
        showFallback();
      }, { once: true });

      let videoFrame = null;
      const updateVideoParallax = () => {
        if (!bgVideo) return;

        if (videoFrame !== null) return;

        videoFrame = requestAnimationFrame(() => {
          const offset = (window.scrollY || 0) * 0.05;
          bgVideo.style.transform = `translate3d(0, ${offset}px, 0)`;
          videoFrame = null;
        });
      };

      window.addEventListener('scroll', updateVideoParallax, { passive: true });
    }

    // =========================================================
    // 3. INTERACTIVE BACKGROUND: PARTICLES + MOUSE GLOW
    // =========================================================

    const canvas = document.getElementById('site-bg-canvas');

    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const mouse = {
          x: -1000,
          y: -1000,
          active: false
        };

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

          const particleCount = Math.min(
            100,
            Math.max(24, Math.floor((width * height) / 16000))
          );

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

  // =========================================================
  // 4. ACTIVE SECTION NAVIGATION
  // =========================================================

  const sections = document.querySelectorAll(
    'section[id], .hero-scroll-track[id]'
  );
  const navLinks = document.querySelectorAll(
    '.nav-link, .mobile-nav-link'
  );

  function updateActiveNavLink() {
    const scrollPos = window.scrollY + 140;
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 60;

    let activeId = 'home';

    if (atBottom) {
      activeId = 'contact';
    } else {
      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top + window.scrollY;
        const bottom = top + section.offsetHeight;

        if (scrollPos >= top && scrollPos < bottom) {
          activeId = section.id;
        }
      });
    }

    navLinks.forEach((link) => {
      link.classList.toggle(
        'active',
        link.getAttribute('href') === `#${activeId}`
      );
    });
  }

  window.addEventListener('scroll', updateActiveNavLink, { passive: true });
  updateActiveNavLink();

  // =========================================================
  // 5. MOBILE NAVIGATION
  // =========================================================

  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileToggle && mobileDrawer) {
    function toggleMenu() {
      const isOpen = mobileToggle.classList.toggle('open');

      mobileDrawer.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function closeMenu() {
      mobileToggle.classList.remove('open');
      mobileDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }

    mobileToggle.addEventListener('click', toggleMenu);

    mobileDrawer.querySelectorAll('.mobile-nav-link, a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  // =========================================================
  // 6. TECHNICAL SKILLS FILTERS
  // =========================================================

  const skillTabs = document.querySelectorAll('.skill-tab-btn');
  const skillCards = document.querySelectorAll('.skill-card');

  if (skillTabs.length && skillCards.length) {
    skillTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        skillTabs.forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter');

        skillCards.forEach((card) => {
          const matches =
            filter === 'all' ||
            card.getAttribute('data-category') === filter;

          if (matches) {
            card.style.display = 'flex';

            requestAnimationFrame(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            });
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';

            setTimeout(() => {
              if (card.style.opacity === '0') {
                card.style.display = 'none';
              }
            }, 200);
          }
        });
      });
    });
  }

  // =========================================================
  // 7. MEDIFLOW DETAILS MODAL
  // =========================================================

  const openModalBtn = document.getElementById('btn-open-mediflow-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const modalOverlay = document.getElementById('mediflow-modal');

  if (openModalBtn && modalOverlay) {
    function closeModal() {
      modalOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    openModalBtn.addEventListener('click', () => {
      modalOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
    }

    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) closeModal();
    });

    window.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        modalOverlay.classList.contains('open')
      ) {
        closeModal();
      }
    });
  }

  // =========================================================
  // 8. CONTACT FORM VALIDATION
  // =========================================================

  const contactForm = document.getElementById('portfolio-contact-form');
  const formAlert = document.getElementById('form-status-alert');

  if (contactForm && formAlert) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const subjectInput = document.getElementById('contact-subject');
      const messageInput = document.getElementById('contact-message');

      if (!nameInput || !emailInput || !messageInput) return;

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subject = subjectInput
        ? subjectInput.value.trim() || 'Portfolio Inquiry'
        : 'Portfolio Inquiry';
      const message = messageInput.value.trim();

      if (!name || !email || !message) {
        showAlert(
          'Please fill in all required fields (Name, Email, Message).',
          'error'
        );
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        showAlert('Please provide a valid email address.', 'error');
        return;
      }

      const recipient = 'satyarohith2005@gmail.com';
      const encodedSubject = encodeURIComponent(
        `[Portfolio Contact] ${subject} - from ${name}`
      );
      const encodedBody = encodeURIComponent(
        `Hello Satya,\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nSent from Portfolio Website`
      );

      const mailtoUri =
        `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;

      showAlert(
        `Thank you, ${name}! Your email application will open so you can send your message to Satya.`,
        'success'
      );

      setTimeout(() => {
        window.location.href = mailtoUri;
      }, 700);
    });

    function showAlert(message, type) {
      formAlert.textContent = message;
      formAlert.className = `form-status-alert ${type}`;
      formAlert.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }

  // =========================================================
  // 9. SCROLL REVEAL ANIMATIONS
  // =========================================================

  const revealItems = document.querySelectorAll('.reveal-item');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else if (
            entry.boundingClientRect.top > window.innerHeight
          ) {
            entry.target.classList.remove('revealed');
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealItems.forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight - 30) {
        element.classList.add('revealed');
      }

      observer.observe(element);
    });
  } else {
    revealItems.forEach((element) => {
      element.classList.add('revealed');
    });
  }

  // =========================================================
  // 10. SMOOTH ANCHOR SCROLLING
  // =========================================================

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (event) {
      const targetId = this.getAttribute('href');

      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      event.preventDefault();

      if (mobileDrawer && mobileDrawer.classList.contains('open')) {
        if (mobileToggle) mobileToggle.classList.remove('open');

        mobileDrawer.classList.remove('open');
        document.body.style.overflow = '';
      }

      if (targetId === '#home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const headerOffset = 80;
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    });
  });
})();
