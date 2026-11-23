/* ============================================================
   INTERIO – JavaScript (Apple-style interactions)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Navbar scroll effect ─────────────────────────────── */
  const nav = document.getElementById('mainNav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ── Mobile menu ─────────────────────────────────────── */
  const burger = document.getElementById('navBurger');
  const mobileMenu = document.getElementById('navMobile');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      // Animate burger
      const spans = burger.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity  = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      });
    });
  }

  /* ── Intersection Observer – reveal animations ───────── */
  const revealEls = document.querySelectorAll(
    '.reveal-up, .reveal-left, .reveal-right, .reveal-scale'
  );
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  /* ── Parallax hero bg ────────────────────────────────── */
  const parallaxSections = document.querySelectorAll('.parallax-section');
  if (parallaxSections.length) {
    window.addEventListener('scroll', () => {
      parallaxSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const bg = section.querySelector('.parallax-bg');
        if (bg && rect.bottom > 0 && rect.top < window.innerHeight) {
          const pct = rect.top / window.innerHeight;
          bg.style.transform = `translateY(${pct * 60}px)`;
        }
      });
    }, { passive: true });
  }

  /* ── Generic Carousel factory (Apple-style smoothness & auto-scroll) ── */
  function initCarousel(trackEl, prevBtn, nextBtn, dotsContainer, visibleCountFn, autoScrollSpeed = 2800) {
    if (!trackEl) return;
    const cards = Array.from(trackEl.children);
    if (!cards.length) return;
    const total = cards.length;
    let current = 0;
    let startX = 0, isDragging = false, dragOffset = 0;
    let autoPlayTimer = null;

    const getCardWidth = () => {
      const card = cards[0];
      if (!card) return 0;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(trackEl);
      const gap = parseFloat(style.gap) || 24;
      return rect.width + gap;
    };

    const getMaxIndex = () => {
      const vis = typeof visibleCountFn === 'function' ? visibleCountFn() : (visibleCountFn || 1);
      return Math.max(0, total - vis);
    };

    const updateDots = () => {
      if (!dotsContainer) return;
      const dots = dotsContainer.querySelectorAll('.carousel__dot');
      const maxIdx = getMaxIndex();
      const dotCount = dots.length;
      if (!dotCount) return;
      const activeDotIdx = maxIdx > 0 ? Math.round((current / maxIdx) * (dotCount - 1)) : 0;
      dots.forEach((d, i) => {
        d.classList.toggle('active', i === activeDotIdx);
      });
    };

    const buildDots = () => {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      const vis = typeof visibleCountFn === 'function' ? visibleCountFn() : (visibleCountFn || 1);
      const dotCount = Math.min(8, Math.max(3, Math.ceil(total / Math.max(1, vis))));
      const maxIdx = getMaxIndex();
      for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i+1}`);
        dot.addEventListener('click', () => {
          const target = Math.round((i / (dotCount - 1)) * maxIdx);
          goTo(target);
          resetAutoPlay();
        });
        dotsContainer.appendChild(dot);
      }
    };

    function goTo(idx, animated = true) {
      const maxIdx = getMaxIndex();
      if (idx > maxIdx) {
        current = 0; // seamless wrap around
      } else if (idx < 0) {
        current = maxIdx;
      } else {
        current = idx;
      }
      
      const w = getCardWidth();
      trackEl.style.transition = animated ? 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
      trackEl.style.transform = `translateX(-${current * w}px)`;
      updateDots();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        goTo(current - 1);
        resetAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        goTo(current + 1);
        resetAutoPlay();
      });
    }

    // Touch & pointer dragging
    const onDragStart = (clientX) => {
      isDragging = true;
      startX = clientX;
      dragOffset = 0;
      trackEl.style.transition = 'none';
      stopAutoPlay();
    };

    const onDragMove = (clientX) => {
      if (!isDragging) return;
      dragOffset = clientX - startX;
      const w = getCardWidth();
      const currentTranslate = -current * w;
      trackEl.style.transform = `translateX(${currentTranslate + dragOffset}px)`;
    };

    const onDragEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      trackEl.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      const threshold = 40;
      if (dragOffset < -threshold) {
        goTo(current + 1);
      } else if (dragOffset > threshold) {
        goTo(current - 1);
      } else {
        goTo(current);
      }
      dragOffset = 0;
      startAutoPlay();
    };

    trackEl.addEventListener('mousedown', e => {
      onDragStart(e.clientX);
    });
    window.addEventListener('mousemove', e => {
      if (isDragging) onDragMove(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      if (isDragging) onDragEnd();
    });

    trackEl.addEventListener('touchstart', e => {
      if (e.touches.length === 1) onDragStart(e.touches[0].clientX);
    }, { passive: true });
    trackEl.addEventListener('touchmove', e => {
      if (isDragging && e.touches.length === 1) onDragMove(e.touches[0].clientX);
    }, { passive: true });
    trackEl.addEventListener('touchend', () => onDragEnd());

    // Auto Play with smooth cadence
    function startAutoPlay() {
      if (autoPlayTimer) clearInterval(autoPlayTimer);
      autoPlayTimer = setInterval(() => {
        const maxIdx = getMaxIndex();
        goTo(current >= maxIdx ? 0 : current + 1);
      }, autoScrollSpeed);
    }

    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    function resetAutoPlay() {
      stopAutoPlay();
      startAutoPlay();
    }

    const container = trackEl.closest('.carousel-wrap, .testimonial-carousel, .carousel');
    if (container) {
      container.addEventListener('mouseenter', stopAutoPlay);
      container.addEventListener('mouseleave', startAutoPlay);
    }

    buildDots();
    goTo(0, false);
    startAutoPlay();

    window.addEventListener('resize', () => {
      buildDots();
      goTo(current, false);
    }, { passive: true });
  }

  // Styles carousel (used on both index.html and styles.html)
  const stylesTrack = document.getElementById('stylesTrack');
  const getVisible = () => window.innerWidth < 600 ? 1 : window.innerWidth < 1024 ? 2 : 4;
  initCarousel(
    stylesTrack,
    document.getElementById('stylesPrev'),
    document.getElementById('stylesNext'),
    document.getElementById('stylesDots'),
    getVisible,
    2600
  );

  // Testimonial carousel (shows 3 on desktop)
  const testimonialTrack = document.getElementById('testimonialTrack');
  const getTestimonialVisible = () => window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
  initCarousel(
    testimonialTrack,
    document.getElementById('testimonialPrev'),
    document.getElementById('testimonialNext'),
    document.getElementById('testimonialDots'),
    getTestimonialVisible,
    3500
  );

  /* ── Counter animation ────────────────────────────────── */
  const counters = document.querySelectorAll('.stat__num');
  if (counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          const target = parseInt(el.dataset.target);
          const duration = 1800;
          const start = performance.now();
          const easeOut = t => 1 - Math.pow(1 - t, 3);
          const tick = now => {
            const p = Math.min((now - start) / duration, 1);
            el.textContent = Math.floor(easeOut(p) * target);
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = target;
          };
          requestAnimationFrame(tick);
          cio.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cio.observe(c));
  }

  /* ── Smooth scroll for anchor links ──────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── Page transition fade-in ─────────────────────────── */
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });

  /* ── Filter tabs (Styles / Services page) ────────────── */
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      document.querySelectorAll('[data-category]').forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.style.display = show ? '' : 'none';
        if (show) {
          card.style.animation = 'fadeIn 0.4s ease forwards';
        }
      });
    });
  });

  /* ── Contact form ─────────────────────────────────────── */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('.form-submit');
      btn.textContent = 'Sending…';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '✓ Message Sent!';
        btn.style.background = '#27ae60';
        setTimeout(() => {
          btn.textContent = 'Send Message';
          btn.style.background = '';
          btn.disabled = false;
          contactForm.reset();
        }, 3000);
      }, 1500);
    });
  }

  /* ── Room Look Switcher ──────────────────────────────── */
  const initRoomSwitcher = () => {
    const stage = document.getElementById('roomStage');
    const dotsGroup = document.getElementById('roomDots');
    const label = document.getElementById('roomLabel');
    const section = document.getElementById('roomSwitcherSection');

    if (!stage || !dotsGroup || !label) return;

    const roomLooks = [
      {
        name: "Daylight Grey",
        color: "#bdbab5",
        image: "https://res.cloudinary.com/deiwigg5a/image/upload/v1795418967/Living_-5-1_gwfj1s.webp",
        alt: "Contemporary living room in Daylight Grey palette with soft natural lighting and warm neutral furnishings"
      },
      {
        name: "Emerald Evening",
        color: "#1f5a45",
        image: "https://res.cloudinary.com/deiwigg5a/image/upload/v1795418933/interior_img_2_xrhtsu.webp",
        alt: "Contemporary living room in Emerald Evening palette with rich deep green tones and dramatic ambient lighting"
      }
    ];

    // Preload all look images immediately and decode before first switch
    roomLooks.forEach(look => {
      const preloadImg = new Image();
      preloadImg.src = look.image;
      if ('decode' in preloadImg) {
        preloadImg.decode().catch(() => {});
      }
    });

    let currentIndex = 0;
    let cleanupTimer = null;
    let labelFadeTimer = null;
    let hintTimer = null;
    let hasInteracted = false;
    const layers = [];
    const dots = [];

    // Clear stage and dots container
    stage.innerHTML = '';
    dotsGroup.innerHTML = '';

    const stopHintPulse = () => {
      hasInteracted = true;
      if (hintTimer) {
        clearTimeout(hintTimer);
        hintTimer = null;
      }
      dots.forEach(dot => dot.classList.remove('is-hinting'));
    };

    // Smooth label fade transition (~250ms total: 125ms out, 125ms in)
    const updateLabel = (newText) => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion || !label.textContent) {
        label.textContent = newText;
        label.classList.remove('is-fading');
        return;
      }

      if (labelFadeTimer) {
        clearTimeout(labelFadeTimer);
        labelFadeTimer = null;
      }

      label.classList.add('is-fading');
      labelFadeTimer = setTimeout(() => {
        label.textContent = newText;
        label.classList.remove('is-fading');
        labelFadeTimer = null;
      }, 125);
    };

    // Build layers and dots from array
    roomLooks.forEach((look, idx) => {
      // Create layer
      const layer = document.createElement('div');
      layer.className = 'room-layer' + (idx === 0 ? ' is-active' : '');

      const img = document.createElement('img');
      img.src = look.image;
      img.alt = look.alt;
      img.width = 1920;
      img.height = 1080;
      img.decoding = 'async';
      img.loading = idx === 0 ? 'eager' : 'lazy';

      layer.appendChild(img);
      stage.appendChild(layer);
      layers.push(layer);

      // Create dot button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'room-dot';
      btn.style.backgroundColor = look.color;
      btn.setAttribute('aria-label', look.name);
      btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');

      btn.addEventListener('click', () => {
        stopHintPulse();
        switchLook(idx);
      });
      dotsGroup.appendChild(btn);
      dots.push(btn);
    });

    // Set initial look label
    label.textContent = roomLooks[0].name;

    function switchLook(targetIndex) {
      if (targetIndex === currentIndex) return;

      stopHintPulse();
      const outgoingIndex = currentIndex;
      const incomingIndex = targetIndex;

      // Handle fast repeated clicks safely by clearing any pending timeout
      if (cleanupTimer) {
        clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }

      // Crossfade logic:
      // Outgoing layer stays at full opacity underneath (z-index 1)
      // Incoming layer starts at opacity 0 on top (z-index 2) with subtle settle start scale
      // Non-involved layers remain hidden
      layers.forEach((layer, idx) => {
        if (idx === outgoingIndex) {
          layer.className = 'room-layer is-outgoing';
        } else if (idx === incomingIndex) {
          layer.className = 'room-layer is-incoming-start';
        } else {
          layer.className = 'room-layer';
        }
      });

      // Force reflow to ensure the browser registers opacity: 0 and scale(1.045) before transitioning
      void layers[incomingIndex].offsetWidth;

      // Animate incoming layer to opacity: 1 and settle scale to base
      layers[incomingIndex].className = 'room-layer is-incoming';

      // Update state, dot pressed states and smooth label transition
      currentIndex = incomingIndex;
      dots.forEach((dot, idx) => {
        dot.setAttribute('aria-pressed', idx === incomingIndex ? 'true' : 'false');
      });
      updateLabel(roomLooks[incomingIndex].name);

      // Detect prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delay = prefersReducedMotion ? 0 : 950;

      // Clean up: hide outgoing layer once transition ends (~950ms)
      cleanupTimer = setTimeout(() => {
        layers.forEach((layer, idx) => {
          layer.className = 'room-layer' + (idx === currentIndex ? ' is-active' : '');
        });
        cleanupTimer = null;
      }, delay);
    }

    // Keyboard navigation: Left/Right Arrow, Up/Down Arrow, Home, End
    dotsGroup.addEventListener('keydown', (e) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(e.key)) return;

      e.preventDefault();
      stopHintPulse();
      const total = roomLooks.length;
      let nextIndex = currentIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % total;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + total) % total;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = total - 1;
      }

      if (nextIndex !== currentIndex) {
        switchLook(nextIndex);
      }
      dots[nextIndex].focus();
    });

    // Mobile swipe navigation with pointer events (min 40px, non-blocking vertical scroll)
    let pointerStartX = 0;
    let pointerStartY = 0;
    let isPointerDown = false;

    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      isPointerDown = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
    });

    stage.addEventListener('pointerup', (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      const diffX = e.clientX - pointerStartX;
      const diffY = e.clientY - pointerStartY;

      if (Math.abs(diffX) >= 40 && Math.abs(diffX) > Math.abs(diffY)) {
        stopHintPulse();
        if (diffX < 0) {
          // Swipe left -> next look
          switchLook((currentIndex + 1) % roomLooks.length);
        } else {
          // Swipe right -> previous look
          switchLook((currentIndex - 1 + roomLooks.length) % roomLooks.length);
        }
      }
    });

    stage.addEventListener('pointercancel', () => {
      isPointerDown = false;
    });

    // Entrance animation and gentle hint pulse on unselected dot
    if (section) {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              section.classList.add('is-entered');
              observer.unobserve(section);
              observer.disconnect();

              if (!hasInteracted) {
                hintTimer = setTimeout(() => {
                  if (!hasInteracted) {
                    dots.forEach((dot, idx) => {
                      if (idx !== currentIndex) {
                        dot.classList.add('is-hinting');
                        dot.addEventListener('animationend', () => {
                          dot.classList.remove('is-hinting');
                        }, { once: true });
                      }
                    });
                  }
                }, 700);
              }
            }
          });
        }, { threshold: 0.15 });
        observer.observe(section);
      } else {
        section.classList.add('is-entered');
      }
    }
  };

  initRoomSwitcher();
});

/* Global CSS animation */
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);
