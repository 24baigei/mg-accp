/* ============================================================
   CryFlow — Section Animations & Interactions
   Each section has a unique "signature" entrance animation
   triggered once on scroll via IntersectionObserver.
   ============================================================ */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 1. Prepare SVG draw-paths (set dasharray/dashoffset) ----------
  function prepareDrawPaths() {
    var paths = document.querySelectorAll('.draw-path');
    paths.forEach(function (p) {
      try {
        var len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      } catch (e) {
        // Element doesn't support getTotalLength
      }
    });
  }

  // ---------- 1b. Prepare XRD contour lines (dynamic dasharray) ----------
  function prepareXrdLines() {
    var lines = document.querySelectorAll('.xrd-line');
    lines.forEach(function (line) {
      try {
        var len = line.getTotalLength();
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
      } catch (e) {}
    });
  }

  // ---------- 2. Section-level animation observer ----------
  var animatedSections = new Set();

  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !animatedSections.has(entry.target)) {
          animatedSections.add(entry.target);
          entry.target.classList.add('animated');
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  // Observe all main sections
  var sections = document.querySelectorAll(
    '.hero, .problem, .material, .routes, .evidence, .validation, .product, .matrix'
  );

  if (reducedMotion) {
    // Skip animations: mark everything as animated immediately
    sections.forEach(function (s) { s.classList.add('animated'); });
  } else {
    prepareDrawPaths();
    prepareXrdLines();
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  // ---------- 3. Legacy .reveal observer (for remaining elements) ----------
  var revealElements = document.querySelectorAll('.reveal');

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  if (!reducedMotion) {
    revealElements.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealElements.forEach(function (el) { el.classList.add('visible'); });
  }

  // ---------- 4. Image Lightbox ----------
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = lightbox ? lightbox.querySelector('img') : null;

  document.querySelectorAll('[data-lightbox]').forEach(function (container) {
    var img = container.querySelector('img');
    if (!img) return;
    container.style.cursor = 'zoom-in';
    container.addEventListener('click', function () {
      if (!lightbox || !lightboxImg) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxImg.removeAttribute('aria-hidden');
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  if (lightbox) {
    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      if (lightboxImg) lightboxImg.setAttribute('aria-hidden', 'true');
    }
    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }

  // ---------- 5. Smooth anchor scroll ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    var href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

})();
