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
    let autoPlayTimer = null;
    let userScrollTimer = null;
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasDragged = false;
    let isTicking = false;

    const getCardStep = () => {
      const card = cards[0];
      if (!card) return 314;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(trackEl);
      const gap = parseFloat(style.gap) || 24;
      return rect.width + gap;
    };

    const getMaxScroll = () => {
      return Math.max(0, trackEl.scrollWidth - trackEl.clientWidth);
    };

    const updateControls = () => {
      const maxScroll = getMaxScroll();
      const currentScroll = trackEl.scrollLeft;

      // Update Prev / Next buttons at boundaries
      if (prevBtn) {
        const isStart = currentScroll <= 6;
        prevBtn.disabled = isStart;
        prevBtn.setAttribute('aria-disabled', String(isStart));
      }
      if (nextBtn) {
        const isEnd = currentScroll >= maxScroll - 6;
        nextBtn.disabled = isEnd;
        nextBtn.setAttribute('aria-disabled', String(isEnd));
      }

      // Update Dots
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.carousel__dot');
        const dotCount = dots.length;
        if (dotCount > 0) {
          const activeIdx = maxScroll > 0
            ? Math.min(dotCount - 1, Math.max(0, Math.round((currentScroll / maxScroll) * (dotCount - 1))))
            : 0;
          dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === activeIdx);
            dot.setAttribute('aria-pressed', String(idx === activeIdx));
          });
        }
      }
    };

    const buildDots = () => {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      const vis = typeof visibleCountFn === 'function' ? visibleCountFn() : (visibleCountFn || 1);
      const dotCount = Math.min(8, Math.max(3, Math.ceil(total / Math.max(1, vis))));
      for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
        dot.addEventListener('click', () => {
          const maxScroll = getMaxScroll();
          const target = (i / (dotCount - 1)) * maxScroll;
          trackEl.scrollTo({ left: target, behavior: 'smooth' });
          resetAutoPlay();
        });
        dotsContainer.appendChild(dot);
      }
    };

    // Scroll listener throttled with requestAnimationFrame
    trackEl.addEventListener('scroll', () => {
      if (!isTicking) {
        requestAnimationFrame(() => {
          updateControls();
          isTicking = false;
        });
        isTicking = true;
      }
      // Pause autoplay during user scroll, resume after quiet period
      stopAutoPlay();
      clearTimeout(userScrollTimer);
      userScrollTimer = setTimeout(() => {
        startAutoPlay();
      }, 3500);
    }, { passive: true });

    // Arrow buttons using track.scrollBy
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const step = getCardStep();
        trackEl.scrollBy({ left: -step, behavior: 'smooth' });
        resetAutoPlay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const step = getCardStep();
        trackEl.scrollBy({ left: step, behavior: 'smooth' });
        resetAutoPlay();
      });
    }

    // Desktop mouse drag-to-scroll without breaking clicks on cards
    trackEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasDragged = false;
      startX = e.pageX;
      startScrollLeft = trackEl.scrollLeft;
      trackEl.style.scrollBehavior = 'auto';
      trackEl.style.scrollSnapType = 'none';
      stopAutoPlay();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 6) {
        hasDragged = true;
      }
      if (hasDragged) {
        trackEl.scrollLeft = startScrollLeft - dx;
      }
    });

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      trackEl.style.scrollBehavior = '';
      trackEl.style.scrollSnapType = '';

      if (hasDragged) {
        // Prevent accidental card clicks if dragged
        const captureClick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          window.removeEventListener('click', captureClick, true);
        };
        window.addEventListener('click', captureClick, true);
        setTimeout(() => {
          window.removeEventListener('click', captureClick, true);
        }, 50);
        hasDragged = false;
      }
      startAutoPlay();
    };

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('blur', endDrag);

    // Auto Play with smooth cadence
    function startAutoPlay() {
      if (autoPlayTimer) clearInterval(autoPlayTimer);
      autoPlayTimer = setInterval(() => {
        const maxScroll = getMaxScroll();
        const step = getCardStep();
        if (trackEl.scrollLeft >= maxScroll - 10) {
          trackEl.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          trackEl.scrollBy({ left: step, behavior: 'smooth' });
        }
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
      container.addEventListener('touchstart', stopAutoPlay, { passive: true });
    }

    buildDots();
    updateControls();
    startAutoPlay();

    window.addEventListener('resize', () => {
      buildDots();
      updateControls();
    }, { passive: true });
  }

  /* ── Apple-style "12 Signature Styles" Carousel ─────────── */
  function initAppleStylesCarousel() {
    const track = document.getElementById('stylesTrack');
    const pill = document.getElementById('stylesDotsPill');
    const playPauseBtn = document.getElementById('stylesPlayPause');
    if (!track || !pill) return;

    const slides = Array.from(track.querySelectorAll('.style-slide'));
    const total = slides.length;
    if (!total) return;

    const AUTOPLAY_DURATION = 5000;
    const SLIDE_TRANSITION = 900;

    let currentIndex = 0;
    let isPlaying = true;
    let isUserInteracting = false;
    let isSectionVisible = true;
    let progress = 0;
    let lastTimestamp = null;
    let animId = null;
    let isProgrammaticScroll = false;
    let scrollTimeout = null;
    const dots = [];

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;
    if (prefersReducedMotion) {
      isPlaying = false;
    }
    motionQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        isPlaying = false;
        updatePlayPauseButton();
      }
    });

    // Ease-in-out (cubic) curve
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Build pill dots
    pill.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');

      const fill = document.createElement('span');
      fill.className = 'carousel__dot-fill';
      dot.appendChild(fill);

      dot.addEventListener('click', () => {
        goToSlide(i, true);
        progress = 0;
        lastTimestamp = performance.now();
      });

      pill.appendChild(dot);
      dots.push({ btn: dot, fill: fill });
    }

    function getSlideStep() {
      if (!slides[0]) return 880;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.gap) || 20;
      return slides[0].offsetWidth + gap;
    }

    function getTargetScroll(idx) {
      if (idx === 0) return 0;
      const step = getSlideStep();
      return Math.min(idx * step, Math.max(0, track.scrollWidth - track.clientWidth));
    }

    let scrollAnimId = null;
    function smoothScrollTo(targetX, duration = SLIDE_TRANSITION, callback) {
      if (scrollAnimId) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
      }
      isProgrammaticScroll = true;
      track.style.scrollSnapType = 'none';

      const startX = track.scrollLeft;
      const distance = targetX - startX;
      if (Math.abs(distance) < 1) {
        track.scrollLeft = targetX;
        track.style.scrollSnapType = '';
        isProgrammaticScroll = false;
        if (callback) callback();
        return;
      }
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        track.scrollLeft = startX + distance * easeInOutCubic(t);
        if (t < 1) {
          scrollAnimId = requestAnimationFrame(step);
        } else {
          track.scrollLeft = targetX;
          track.style.scrollSnapType = '';
          isProgrammaticScroll = false;
          scrollAnimId = null;
          if (callback) callback();
        }
      }
      scrollAnimId = requestAnimationFrame(step);
    }

    function updateActiveDot(index) {
      dots.forEach((d, i) => {
        const isActive = i === index;
        d.btn.classList.toggle('active', isActive);
        d.btn.setAttribute('aria-selected', String(isActive));
        if (!isActive) {
          d.fill.style.width = '0%';
        }
      });
    }

    function goToSlide(targetIdx, smooth = true) {
      currentIndex = (targetIdx + total) % total;
      updateActiveDot(currentIndex);
      const targetScroll = getTargetScroll(currentIndex);
      if (smooth) {
        smoothScrollTo(targetScroll, SLIDE_TRANSITION);
      } else {
        track.scrollLeft = targetScroll;
      }
    }

    function updatePlayPauseButton() {
      if (!playPauseBtn) return;
      const pauseIcon = playPauseBtn.querySelector('.icon-pause');
      const playIcon = playPauseBtn.querySelector('.icon-play');
      if (isPlaying) {
        if (pauseIcon) pauseIcon.style.display = '';
        if (playIcon) playIcon.style.display = 'none';
        playPauseBtn.setAttribute('aria-label', 'Pause autoplay');
        playPauseBtn.setAttribute('title', 'Pause');
      } else {
        if (pauseIcon) pauseIcon.style.display = 'none';
        if (playIcon) playIcon.style.display = '';
        playPauseBtn.setAttribute('aria-label', 'Play autoplay');
        playPauseBtn.setAttribute('title', 'Play');
      }
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
          isPlaying = false;
        } else {
          if (prefersReducedMotion) return;
          isPlaying = true;
          lastTimestamp = performance.now();
        }
        updatePlayPauseButton();
      });
      updatePlayPauseButton();
    }

    // Main animation loop for progress fill and auto slide advancement
    function animationLoop(timestamp) {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dt = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const shouldAdvance = isPlaying && isSectionVisible && !isUserInteracting && !prefersReducedMotion;
      if (shouldAdvance) {
        progress += dt / AUTOPLAY_DURATION;
        if (progress >= 1) {
          progress = 0;
          goToSlide((currentIndex + 1) % total, true);
        } else {
          const currentDot = dots[currentIndex];
          if (currentDot) {
            currentDot.fill.style.width = `${Math.min(100, progress * 100)}%`;
          }
        }
      }

      animId = requestAnimationFrame(animationLoop);
    }
    animId = requestAnimationFrame(animationLoop);

    // Pause autoplay when section is off screen (IntersectionObserver)
    const carouselSection = track.closest('.styles-section') || track;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isSectionVisible = entry.isIntersecting;
        if (isSectionVisible) {
          lastTimestamp = performance.now();
        }
      });
    }, { threshold: 0.15 });
    observer.observe(carouselSection);

    // Track scroll listener for trackpad, touch, and manual gestures
    track.addEventListener('scroll', () => {
      if (isProgrammaticScroll) return;

      isUserInteracting = true;
      const step = getSlideStep();
      const snappedIdx = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / step)));
      if (snappedIdx !== currentIndex) {
        currentIndex = snappedIdx;
        updateActiveDot(currentIndex);
        progress = 0;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserInteracting = false;
        lastTimestamp = performance.now();
      }, 1200);
    }, { passive: true });

    // Stop programmatic scroll on user touch/drag
    track.addEventListener('touchstart', () => {
      if (scrollAnimId) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
        track.style.scrollSnapType = '';
        isProgrammaticScroll = false;
      }
      isUserInteracting = true;
    }, { passive: true });

    // Desktop mouse drag-to-scroll without breaking CTA link clicks
    let isMouseDown = false;
    let startX = 0;
    let startScroll = 0;
    let hasDragged = false;

    track.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('a, button')) return;
      if (scrollAnimId) {
        cancelAnimationFrame(scrollAnimId);
        scrollAnimId = null;
        track.style.scrollSnapType = '';
        isProgrammaticScroll = false;
      }
      isMouseDown = true;
      hasDragged = false;
      startX = e.pageX;
      startScroll = track.scrollLeft;
      isUserInteracting = true;
      track.style.scrollBehavior = 'auto';
      track.style.scrollSnapType = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 6) hasDragged = true;
      if (hasDragged) {
        track.scrollLeft = startScroll - dx;
      }
    });

    const stopDrag = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      track.style.scrollBehavior = '';
      track.style.scrollSnapType = '';
      if (hasDragged) {
        const captureClick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          window.removeEventListener('click', captureClick, true);
        };
        window.addEventListener('click', captureClick, true);
        setTimeout(() => window.removeEventListener('click', captureClick, true), 50);
        hasDragged = false;
      }
      setTimeout(() => {
        isUserInteracting = false;
        lastTimestamp = performance.now();
      }, 1200);
    };

    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('blur', stopDrag);

    // Keep active slide centered on resize
    window.addEventListener('resize', () => {
      if (isProgrammaticScroll || isUserInteracting) return;
      track.scrollLeft = getTargetScroll(currentIndex);
    }, { passive: true });
  }

  // Initialize Styles Carousel (Apple-style on index.html, classic on styles.html if present)
  if (document.getElementById('stylesDotsPill')) {
    initAppleStylesCarousel();
  } else if (document.getElementById('stylesTrack')) {
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
  }

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

    // Preload all look images immediately to avoid any click flicker
    roomLooks.forEach(look => {
      const preloadImg = new Image();
      preloadImg.src = look.image;
    });

    let currentIndex = 0;
    let cleanupTimer = null;
    const layers = [];
    const dots = [];

    // Clear stage and dots container
    stage.innerHTML = '';
    dotsGroup.innerHTML = '';

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

      btn.addEventListener('click', () => switchLook(idx));
      dotsGroup.appendChild(btn);
      dots.push(btn);
    });

    // Set initial look label
    label.textContent = roomLooks[0].name;

    function switchLook(targetIndex) {
      if (targetIndex === currentIndex) return;

      const outgoingIndex = currentIndex;
      const incomingIndex = targetIndex;

      // Handle fast repeated clicks safely by clearing any pending timeout
      if (cleanupTimer) {
        clearTimeout(cleanupTimer);
        cleanupTimer = null;
      }

      // Crossfade logic:
      // Outgoing layer stays at full opacity underneath (z-index 1)
      // Incoming layer starts at opacity 0 on top (z-index 2)
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

      // Force reflow to ensure the browser registers opacity: 0 before transitioning
      void layers[incomingIndex].offsetWidth;

      // Animate incoming layer to opacity: 1 on top
      layers[incomingIndex].className = 'room-layer is-incoming';

      // Update state, dot pressed states and aria-live label
      currentIndex = incomingIndex;
      dots.forEach((dot, idx) => {
        dot.setAttribute('aria-pressed', idx === incomingIndex ? 'true' : 'false');
      });
      label.textContent = roomLooks[incomingIndex].name;

      // Detect prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delay = prefersReducedMotion ? 0 : 750;

      // Clean up: hide outgoing layer once transition ends (~750ms)
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
