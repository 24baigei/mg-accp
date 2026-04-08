/* ============================================================
   CryFlow — Fullpage Transitions (PPT mode) + Horizontal Corridor
   ============================================================ */

(function () {
  'use strict';

  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var dotsContainer = document.getElementById('pageDots');
  if (!pages.length) return;

  var current = 0;
  var locked = false;
  var ANIM_MS = 600;
  var touchStartY = 0;
  var touchStartX = 0;

  /* ==========================================================
     CORRIDOR (horizontal scroll inside Evidence page)
     ========================================================== */
  var corridor = document.getElementById('corridor');
  var track    = document.getElementById('corridorTrack');
  var bar      = document.getElementById('corridorBar');
  var counter  = document.getElementById('corridorCounter');
  var slides   = track ? Array.prototype.slice.call(track.querySelectorAll('.corridor__slide')) : [];
  var cSlide   = 0; // current slide index within corridor
  var TOTAL    = slides.length || 1;

  function isOnCorridor() {
    return pages[current] && pages[current].id === 'evidence';
  }

  var evidenceSection = document.getElementById('evidence');

  function updateCorridor() {
    if (!track) return;
    track.style.transform = 'translateX(-' + (cSlide * 100) + 'vw)';
    if (bar) bar.style.width = ((cSlide + 1) / TOTAL * 100) + '%';
    if (counter) counter.textContent = (cSlide + 1) + ' / ' + TOTAL;

    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === cSlide);
    });

    // Update XRD background stage
    if (evidenceSection) {
      evidenceSection.setAttribute('data-stage', String(cSlide + 1));
    }
  }

  function corridorNext() {
    if (cSlide < TOTAL - 1) {
      cSlide++;
      updateCorridor();
      return true; // consumed
    }
    return false; // at end, let fullpage handle it
  }

  function corridorPrev() {
    if (cSlide > 0) {
      cSlide--;
      updateCorridor();
      return true;
    }
    return false; // at start, let fullpage handle it
  }

  function corridorReset() {
    cSlide = 0;
    updateCorridor();
  }

  // Init first slide
  if (slides.length) {
    slides[0].classList.add('active');
    updateCorridor();
  }

  /* ==========================================================
     PAGE DOTS
     ========================================================== */
  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    pages.forEach(function (_, i) {
      var btn = document.createElement('button');
      btn.className = 'page-dots__dot' + (i === 0 ? ' current' : '');
      btn.setAttribute('aria-label', '第 ' + (i + 1) + ' 页');
      btn.addEventListener('click', function () { goTo(i); });
      dotsContainer.appendChild(btn);
    });
  }

  function updateDots() {
    if (!dotsContainer) return;
    var dots = dotsContainer.querySelectorAll('.page-dots__dot');
    dots.forEach(function (d, i) {
      d.classList.toggle('current', i === current);
    });
  }

  /* ==========================================================
     ANIMATION HELPERS
     ========================================================== */
  function cleanAnim(el) {
    el.classList.remove(
      'exiting', 'anim-enter', 'anim-enter-reverse',
      'anim-exit-iris', 'anim-exit-wipe', 'anim-exit-hex',
      'anim-exit-fold', 'anim-exit-blur', 'anim-exit-radial',
      'anim-exit-fade', 'anim-exit-curtain'
    );
    el.style.clipPath = '';
    el.style.transform = '';
    el.style.filter = '';
    el.style.opacity = '';
    el.style.transformOrigin = '';
  }

  /* ==========================================================
     NAVIGATE
     ========================================================== */
  function goTo(target) {
    if (locked || target === current || target < 0 || target >= pages.length) return;
    locked = true;

    var dir = target > current ? 1 : -1;
    var from = pages[current];
    var to = pages[target];
    var exitType = from.dataset.exit;

    pages.forEach(cleanAnim);

    to.classList.add('active');
    to.classList.add(dir > 0 ? 'anim-enter' : 'anim-enter-reverse');
    to.scrollTop = 0;

    from.classList.add('exiting');
    if (exitType && dir > 0) {
      from.classList.add('anim-exit-' + exitType);
    } else {
      from.classList.add('anim-exit-fade');
    }

    if (!to.classList.contains('animated')) {
      setTimeout(function () { to.classList.add('animated'); }, 150);
    }

    // Reset corridor when entering evidence page
    if (to.id === 'evidence') {
      corridorReset();
    }

    setTimeout(function () {
      from.classList.remove('active', 'exiting');
      cleanAnim(from);
      cleanAnim(to);
      to.classList.add('active');
      current = target;
      updateDots();
      setTimeout(function () { locked = false; }, 150);
    }, ANIM_MS);
  }

  function handleNext() {
    if (locked) return;
    // If on corridor page, try corridor first
    if (isOnCorridor()) {
      locked = true;
      if (corridorNext()) {
        setTimeout(function () { locked = false; }, 500);
        return;
      }
      locked = false;
    }
    goTo(current + 1);
  }

  function handlePrev() {
    if (locked) return;
    if (isOnCorridor()) {
      locked = true;
      if (corridorPrev()) {
        setTimeout(function () { locked = false; }, 500);
        return;
      }
      locked = false;
    }
    goTo(current - 1);
  }

  /* ==========================================================
     WHEEL
     ========================================================== */
  window.addEventListener('wheel', function (e) {
    if (locked) return;

    // If on a page with internal scroll (not corridor), handle that
    var page = pages[current];
    if (!isOnCorridor()) {
      var scrollable = page.scrollHeight > page.clientHeight + 2;
      if (scrollable) {
        if (e.deltaY > 0 && page.scrollTop + page.clientHeight < page.scrollHeight - 1) return;
        if (e.deltaY < 0 && page.scrollTop > 1) return;
      }
    }

    e.preventDefault();
    if (e.deltaY > 20) handleNext();
    else if (e.deltaY < -20) handlePrev();
  }, { passive: false });

  /* ==========================================================
     TOUCH
     ========================================================== */
  window.addEventListener('touchstart', function (e) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  window.addEventListener('touchend', function (e) {
    if (locked) return;
    var dy = touchStartY - e.changedTouches[0].clientY;
    var dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dy) < 50 || Math.abs(dx) > Math.abs(dy)) return;

    if (dy > 50) handleNext();
    else if (dy < -50) handlePrev();
  }, { passive: true });

  /* ==========================================================
     KEYBOARD
     ========================================================== */
  window.addEventListener('keydown', function (e) {
    if (locked) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
      case 'ArrowRight':
        e.preventDefault();
        handleNext();
        break;
      case 'ArrowUp':
      case 'PageUp':
      case 'ArrowLeft':
        e.preventDefault();
        handlePrev();
        break;
      case 'Home':
        e.preventDefault();
        goTo(0);
        break;
      case 'End':
        e.preventDefault();
        goTo(pages.length - 1);
        break;
    }
  });

  /* ==========================================================
     INIT
     ========================================================== */
  pages[0].classList.add('active', 'animated');
  buildDots();

})();
