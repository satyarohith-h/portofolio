/**
 * SATYA ROHITH — PORTFOLIO MAIN SCRIPT
 * Manages Navigation, Scroll Progress, Section Highlighting,
 * Skill Filters, Interactive Modals, and Contact Form.
 */

(function () {
  'use strict';

  // --- 1. Scroll Progress Bar & Header State ---
  const progressBar = document.getElementById('scroll-progress-bar');
  const siteHeader = document.querySelector('.site-header');
  const backToTopBtn = document.getElementById('back-to-top');

  function updateScrollMetrics() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (siteHeader) {
      if (scrollTop > 60) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }

    if (backToTopBtn) {
      if (scrollTop > 450) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  }

  window.addEventListener('scroll', updateScrollMetrics, { passive: true });
  updateScrollMetrics();

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- Background Video Controller & Smooth Parallax ---
  const bgVideo = document.getElementById('site-bg-video');
  if (bgVideo) {
    const playPromise = bgVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const startOnInteraction = () => {
          bgVideo.play();
          window.removeEventListener('click', startOnInteraction);
          window.removeEventListener('touchstart', startOnInteraction);
          window.removeEventListener('scroll', startOnInteraction);
        };
        window.addEventListener('click', startOnInteraction, { passive: true });
        window.addEventListener('touchstart', startOnInteraction, { passive: true });
        window.addEventListener('scroll', startOnInteraction, { passive: true });
      });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY || 0;
          bgVideo.style.transform = `translate3d(0, ${scrollY * 0.05}px, 0)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // --- 2. Active Section Spy for Navigation ---
  const sections = document.querySelectorAll('section[id], .hero-scroll-track[id]');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  function updateActiveNavLink() {
    const scrollPos = window.scrollY + 140;
    const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60);

    let activeId = 'home';

    if (isAtBottom) {
      activeId = 'contact';
    } else {
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
          activeId = id;
        }
      });
    }

    navLinks.forEach((link) => {
      if (link.getAttribute('href') === `#${activeId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNavLink, { passive: true });
  updateActiveNavLink();

  // --- 3. Mobile Navigation Menu Toggle ---
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileToggle && mobileDrawer) {
    function toggleMenu() {
      const isOpen = mobileToggle.classList.toggle('open');
      mobileDrawer.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    mobileToggle.addEventListener('click', toggleMenu);

    // Close when clicking any nav link
    const mobileLinks = mobileDrawer.querySelectorAll('.mobile-nav-link, a');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('open');
        mobileDrawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        toggleMenu();
      }
    });
  }

  // --- 4. Technical Skills Filter Tabs ---
  const skillTabs = document.querySelectorAll('.skill-tab-btn');
  const skillCards = document.querySelectorAll('.skill-card');

  if (skillTabs.length > 0 && skillCards.length > 0) {
    skillTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        skillTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter');

        skillCards.forEach((card) => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'flex';
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, 10);
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(() => {
              card.style.display = 'none';
            }, 200);
          }
        });
      });
    });
  }

  // --- 5. MediFlow Details Modal ---
  const openModalBtn = document.getElementById('btn-open-mediflow-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const modalOverlay = document.getElementById('mediflow-modal');

  if (openModalBtn && modalOverlay) {
    openModalBtn.addEventListener('click', () => {
      modalOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // --- 6. Contact Form Validation & Direct Dispatch ---
  const contactForm = document.getElementById('portfolio-contact-form');
  const formAlert = document.getElementById('form-status-alert');

  if (contactForm && formAlert) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const subjectInput = document.getElementById('contact-subject');
      const messageInput = document.getElementById('contact-message');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subject = subjectInput.value.trim() || 'Portfolio Inquiry';
      const message = messageInput.value.trim();

      // Basic validation
      if (!name || !email || !message) {
        showAlert('Please fill in all required fields (Name, Email, Message).', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAlert('Please provide a valid email address.', 'error');
        return;
      }

      // Compose mailto URI
      const encodedSubject = encodeURIComponent(`[Portfolio Contact] ${subject} - from ${name}`);
      const encodedBody = encodeURIComponent(`Hello Satya,\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nSent from Portfolio Website`);
      const recipient = 'satyarohith2005@gmail.com'; // User's email based on profile/configured placeholder
      const mailtoUri = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;

      // Inform user and launch mail client
      showAlert(
        `Thank you, ${name}! Since this is a static site build, opening your email client now to send directly to Satya. You can also message directly on WhatsApp (+91 8142279161).`,
        'success'
      );

      // Trigger mail client
      setTimeout(() => {
        window.location.href = mailtoUri;
      }, 700);
    });

    function showAlert(text, type) {
      formAlert.textContent = text;
      formAlert.className = `form-status-alert ${type}`;
      formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- 7. Intersection Observer for Scroll Reveal ---
  const revealItems = document.querySelectorAll('.reveal-item');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            // Re-arm animation only when element is scrolled back down below viewport
            const rect = entry.boundingClientRect;
            if (rect.top > window.innerHeight) {
              entry.target.classList.remove('revealed');
            }
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealItems.forEach((el) => {
      // Immediate reveal for elements already in or above the viewport on load
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 30) {
        el.classList.add('revealed');
      }
      observer.observe(el);
    });
  } else {
    // Fallback if IntersectionObserver is unsupported
    revealItems.forEach((el) => el.classList.add('revealed'));
  }

  // --- 8. Smooth Anchor Scrolling with Sticky Offset ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();

        // Close mobile drawer if open
        if (mobileDrawer && mobileDrawer.classList.contains('open')) {
          mobileToggle.classList.remove('open');
          mobileDrawer.classList.remove('open');
          document.body.style.overflow = '';
        }

        if (targetId === '#home') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const headerOffset = 80;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
})();
