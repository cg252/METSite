/* ==========================================================================
   Michigan Electronic Trading — shared site behavior
   ========================================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* Footer year                                                       */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------------------------------------------------------- */
  /* Nav: scroll state + mobile toggle                                 */
  /* ---------------------------------------------------------------- */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  function onScrollNav() {
    if (!nav) return;
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Scroll progress bar                                                */
  /* ---------------------------------------------------------------- */
  var progress = document.getElementById('scrollProgress');
  function onScrollProgress() {
    if (!progress) return;
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progress.style.width = pct + '%';
  }
  window.addEventListener('scroll', onScrollProgress, { passive: true });
  onScrollProgress();

  /* ---------------------------------------------------------------- */
  /* Reveal on scroll                                                   */
  /* ---------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------------- */
  /* Stat counters                                                      */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var done = false;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !done) {
          done = true;
          var start = null;
          var duration = 1400;
          function step(ts) {
            if (!start) start = ts;
            var progressT = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progressT, 3);
            var val = target * eased;
            el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
            if (progressT < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
  });

  /* ---------------------------------------------------------------- */
  /* Ticker tape content                                                */
  /* ---------------------------------------------------------------- */
  var tickerTrack = document.getElementById('tickerTrack');
  if (tickerTrack) {
    var tickerData = [
      ['MET', '+ALPHA', 'up'],
      ['FPGA', 'RTL·VERILOG', 'up'],
      ['LATENCY', '-3.2ns', 'down'],
      ['DESK:TRADING', 'RESEARCH→LIVE', 'up'],
      ['DESK:HARDWARE', 'CO-LOCATION', 'up'],
      ['ORDER BOOK', 'L2·L3', 'down'],
      ['RISK LIMIT', 'ENFORCED', 'up'],
      ['BITSTREAM', '0x1F3A', 'down'],
      ['STRATEGY', 'BACKTEST·OK', 'up'],
      ['EXECUTION', 'LOW-LATENCY', 'up'],
      ['MARKET DATA', 'LIVE FEED', 'down'],
      ['CLOCK', '250MHz', 'up']
    ];
    var html = tickerData
      .map(function (t) {
        var arrow = t[2] === 'up' ? '▲' : '▼';
        return (
          '<span class="ticker-item ' + t[2] + '"><b>' + t[0] + '</b><span>' + t[1] + '</span>' +
          '<span class="dot">' + arrow + '</span></span>'
        );
      })
      .join('');
    // duplicate for seamless loop
    tickerTrack.innerHTML = html + html;
    if (reducedMotion) tickerTrack.style.animationPlayState = 'paused';
  }

  /* ---------------------------------------------------------------- */
  /* Cursor glow                                                        */
  /* ---------------------------------------------------------------- */
  var glow = document.getElementById('cursorGlow');
  if (glow && window.matchMedia('(hover:hover)').matches) {
    var gx = -9999, gy = -9999, cx = -9999, cy = -9999;
    window.addEventListener('mousemove', function (e) {
      gx = e.clientX; gy = e.clientY;
    });
    (function loop() {
      cx += (gx - cx) * 0.12;
      cy += (gy - cy) * 0.12;
      glow.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------------------------------------------------------- */
  /* 3D tilt cards                                                      */
  /* ---------------------------------------------------------------- */
  if (!reducedMotion && window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.tilt').forEach(function (card) {
      var inner = card.querySelector('.tilt-inner') || card;
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        inner.style.transform =
          'rotateX(' + (-py * 10).toFixed(2) + 'deg) rotateY(' + (px * 12).toFixed(2) + 'deg) translateZ(8px)';
      });
      card.addEventListener('mouseleave', function () {
        inner.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0)';
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Binary rain background canvas — faded scrolling FPGA bitstream     */
  /* ---------------------------------------------------------------- */
  var canvas = document.getElementById('binary-canvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var cols, colState, fontSize = 22;

    function freshCol() {
      return {
        active: Math.random() > 0.55,
        y: Math.floor(Math.random() * -30),
        char: Math.random() > 0.5 ? '1' : '0',
        speed: 0.15 + Math.random() * 0.1
      };
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      colState = new Array(cols).fill(0).map(freshCol);
    }
    window.addEventListener('resize', resize);
    resize();

    var speedScale = reducedMotion ? 0.3 : 1;

    function draw() {
      // short trail fade — keeps the field calm instead of smearing/building up
      ctx.fillStyle = 'rgba(4,7,14,0.16)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px JetBrains Mono, monospace';

      for (var i = 0; i < cols; i++) {
        var col = colState[i];

        if (!col.active) {
          // idle columns rarely wake up, keeping most of the field empty/sparse
          if (Math.random() > 0.9985) {
            col.active = true;
            col.y = 0;
          }
          continue;
        }

        var isGreen = i % 2 === 0;
        var y = col.y * fontSize;

        // bright, legible head digit; dimmer (but still readable) as it falls
        if (y < canvas.height * 0.22) {
          ctx.fillStyle = isGreen ? 'rgba(200,255,230,0.55)' : 'rgba(190,230,255,0.55)';
        } else {
          ctx.fillStyle = isGreen ? 'rgba(34,255,168,0.3)' : 'rgba(58,160,255,0.3)';
        }
        ctx.fillText(col.char, i * fontSize, y);

        // rare digit flip — a subtle flicker instead of per-frame noise
        if (Math.random() > 0.985) col.char = col.char === '1' ? '0' : '1';

        col.y += col.speed * speedScale * 0.25;

        if (y > canvas.height + fontSize) {
          Object.assign(col, freshCol());
          col.active = Math.random() > 0.4; // some columns stay idle a while, keeps it sparse
          col.y = Math.floor(Math.random() * -20);
        }
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------------- */
  /* Apply page: track tabs                                            */
  /* ---------------------------------------------------------------- */
  var trackTabs = document.querySelectorAll('.track-tab');
  var trackPanels = document.querySelectorAll('.track-panel');
  trackTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      trackTabs.forEach(function (t) { t.classList.remove('active'); });
      trackPanels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var target = document.getElementById(tab.getAttribute('data-target'));
      if (target) target.classList.add('active');
    });
  });

  /* ---------------------------------------------------------------- */
  /* FAQ accordion                                                      */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-q');
    var answer = item.querySelector('.faq-a');
    if (!btn || !answer) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = null;
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---------------------------------------------------------------- */
  /* Events page: category filter                                      */
  /* ---------------------------------------------------------------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var eventCards = document.querySelectorAll('.event-card');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var cat = btn.getAttribute('data-filter');
      eventCards.forEach(function (card) {
        var show = cat === 'all' || card.getAttribute('data-category') === cat;
        card.classList.toggle('hidden', !show);
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /* Team page: flip cards on tap (mobile)                             */
  /* ---------------------------------------------------------------- */
  document.querySelectorAll('.flip-card').forEach(function (card) {
    card.addEventListener('click', function () {
      if (!window.matchMedia('(hover:hover)').matches) {
        card.classList.toggle('flipped');
      }
    });
  });
})();
