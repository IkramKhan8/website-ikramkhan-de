/* IkramKhan.de: site interactions. Plain JavaScript, no dependencies. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* storage blocked */ } },
  };

  /* ---------- Theme: light / dark with a circular reveal ---------- */
  const themeButtons = document.querySelectorAll('[data-theme-toggle]');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const effectiveTheme = () => {
    const attr = root.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return darkQuery.matches ? 'dark' : 'light';
  };
  const syncThemeUI = () => {
    const theme = effectiveTheme();
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    themeButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      btn.setAttribute('aria-label', label);
      btn.title = label;
    });
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#090E18' : '#F1F3F6');
  };
  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    store.set('ik-theme', theme);
    syncThemeUI();
  };
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || reduceMotion.matches) { applyTheme(next); return; }
      const rect = btn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add('vt-theme');
      let transition;
      try {
        transition = document.startViewTransition(() => applyTheme(next));
      } catch (e) {
        root.classList.remove('vt-theme');
        applyTheme(next);
        return;
      }
      transition.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
      transition.finished.finally(() => root.classList.remove('vt-theme'));
    });
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncThemeUI);
  new MutationObserver(syncThemeUI).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  syncThemeUI();

  /* ---------- Header state and reading progress ---------- */
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  let scheduled = false;
  const onScroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const y = window.scrollY || 0;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (menuBtn && menu) {
    const behind = document.querySelectorAll('main, .site-footer');
    const setMenu = (open, restoreFocus = true) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      menu.inert = !open;
      behind.forEach((el) => { el.inert = open; });
      if (open) {
        const first = menu.querySelector('a');
        if (first) window.setTimeout(() => first.focus({ preventScroll: true }), 60);
      } else if (restoreFocus) {
        menuBtn.focus({ preventScroll: true });
      }
    };
    menu.inert = true;
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
    });
    const wide = window.matchMedia('(min-width: 960px)');
    if (wide.addEventListener) wide.addEventListener('change', (e) => { if (e.matches) setMenu(false, false); });
  }

  /* ---------- Count-up numbers (final values are already in the HTML) ---------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
    const run = (el) => {
      const finalText = el.textContent;
      const target = parseFloat(el.dataset.count);
      const from = parseFloat(el.dataset.from || '0');
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = prefix + (from + (target - from) * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = finalText;
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }

  /* ---------- Copy to clipboard ---------- */
  const selectText = (el) => {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('[data-copy-label]') || btn;
    const original = label.textContent;
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy');
      const done = (message) => {
        label.textContent = message;
        btn.classList.add('is-done');
        window.clearTimeout(btn.copyTimer);
        btn.copyTimer = window.setTimeout(() => {
          label.textContent = original;
          btn.classList.remove('is-done');
        }, 2400);
      };
      const fallback = () => {
        const target = document.getElementById(btn.getAttribute('data-copy-target') || '') || btn.querySelector('.ci-text');
        selectText(target);
        done(target ? (isMac ? 'Press ⌘C' : 'Press Ctrl+C') : 'Copy failed');
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => done('Copied'), fallback);
        } else {
          fallback();
        }
      } catch (e) {
        fallback();
      }
    });
  });

  /* ---------- Accordions ---------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    if (!btn || !panel) return;
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      item.classList.toggle('is-open', open);
      panel.inert = !open;
    };
    set(btn.getAttribute('aria-expanded') === 'true');
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  });

  /* ---------- Filter chips (work page, timeline) ---------- */
  document.querySelectorAll('[data-filter-for]').forEach((bar) => {
    const list = document.getElementById(bar.getAttribute('data-filter-for'));
    if (!list) return;
    const items = Array.from(list.querySelectorAll('[data-tags]'));
    const buttons = Array.from(bar.querySelectorAll('[data-filter]'));
    const status = bar.querySelector('[data-filter-status]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        let shown = 0;
        items.forEach((item) => {
          const show = filter === 'all' || item.getAttribute('data-tags').split(' ').includes(filter);
          item.hidden = !show;
          if (!show) return;
          shown += 1;
          if (!reduceMotion.matches) {
            item.classList.remove('fade-in');
            void item.offsetWidth;
            item.classList.add('fade-in');
          }
        });
        if (status) status.textContent = `${shown} of ${items.length} shown`;
      });
    });
  });

  /* ---------- FAQ search and categories ---------- */
  const faqSearch = document.getElementById('faq-search');
  const faqRoot = document.getElementById('faq-groups');
  if (faqSearch && faqRoot) {
    const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const groups = Array.from(faqRoot.querySelectorAll('.faq-group'));
    const items = Array.from(faqRoot.querySelectorAll('.faq-item'));
    const chips = Array.from(document.querySelectorAll('[data-faq-cat]'));
    const empty = document.getElementById('faq-empty');
    const emptyTerm = document.getElementById('faq-empty-term');
    const count = document.getElementById('faq-count');
    const text = new Map(items.map((it) => [it, normalize(it.textContent)]));
    let category = 'all';
    const apply = () => {
      const words = normalize(faqSearch.value.trim()).split(/\s+/).filter(Boolean);
      let visible = 0;
      groups.forEach((group) => {
        const inCategory = category === 'all' || group.getAttribute('data-cat') === category;
        let inGroup = 0;
        group.querySelectorAll('.faq-item').forEach((item) => {
          const match = inCategory && words.every((w) => text.get(item).includes(w));
          item.hidden = !match;
          if (match) inGroup += 1;
        });
        group.hidden = inGroup === 0;
        visible += inGroup;
      });
      if (empty) empty.hidden = visible > 0;
      if (emptyTerm) emptyTerm.textContent = faqSearch.value.trim();
      if (count) count.textContent = `${visible} question${visible === 1 ? '' : 's'}`;
    };
    faqSearch.addEventListener('input', apply);
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        category = chip.getAttribute('data-faq-cat');
        chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        apply();
      });
    });
    apply();
  }

  /* ---------- Contact form ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    const endpoint = (form.getAttribute('data-endpoint') || '').trim();
    const recipient = form.getAttribute('data-email') || '';
    const submitBtn = form.querySelector('[type="submit"]');
    const submitLabel = form.querySelector('[data-submit-label]');
    const hint = document.getElementById('cf-hint');
    const status = document.getElementById('cf-status');
    const compose = document.getElementById('compose');

    if (endpoint) {
      if (submitLabel) submitLabel.textContent = 'Send message';
      if (hint) hint.textContent = 'I usually reply within 24 hours.';
    }

    const fields = {
      name: { msg: 'Enter your name.', test: (el) => el.value.trim().length > 1 },
      email: { msg: 'Enter an email address like name@company.com.', test: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) },
      message: { msg: 'Add a few sentences about what you would like to discuss (at least 20 characters).', test: (el) => el.value.trim().length >= 20 },
    };
    const check = (name) => {
      const el = form.elements[name];
      const ok = fields[name].test(el);
      const err = document.getElementById(`${el.id}-error`);
      el.setAttribute('aria-invalid', String(!ok));
      if (err) { err.textContent = ok ? '' : fields[name].msg; err.hidden = ok; }
      return ok;
    };
    Object.keys(fields).forEach((name) => {
      const el = form.elements[name];
      if (el.type === 'checkbox') {
        el.addEventListener('change', () => check(name));
      } else {
        el.addEventListener('blur', () => { if (el.value.trim() || el.getAttribute('aria-invalid') === 'true') check(name); });
        el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(name); });
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const failed = Object.keys(fields).filter((name) => !check(name));
      if (failed.length) {
        form.elements[failed[0]].focus();
        if (status) status.textContent = failed.length === 1 ? 'One field needs attention.' : `${failed.length} fields need attention.`;
        return;
      }
      if (status) status.textContent = '';
      const data = new FormData(form);
      const value = (key) => String(data.get(key) || '').trim();

      if (endpoint) {
        submitBtn.disabled = true;
        if (status) status.textContent = 'Sending…';
        try {
          const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          if (status) status.textContent = 'Thank you. Your message was sent and I usually reply within 24 hours.';
        } catch (err) {
          if (status) status.textContent = `Your message could not be sent. Please email me at ${recipient}.`;
        } finally {
          submitBtn.disabled = false;
        }
        return;
      }

      const subject = `Message from ${value('name')} via ikramkhan.de`;
      const body = [
        `Name: ${value('name')}`,
        `Email: ${value('email')}`,
        value('company') && `Organisation / role: ${value('company')}`,
        `Topic: ${value('topic')}`,
        `\n${value('message')}`,
      ].filter(Boolean).join('\n');

      document.getElementById('compose-text').textContent = `To: ${recipient}\nSubject: ${subject}\n\n${body}`;
      document.getElementById('compose-mailto').href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      document.getElementById('compose-copy').setAttribute('data-copy', `To: ${recipient}\nSubject: ${subject}\n\n${body}`);
      compose.hidden = false;
      // Open the visitor's email app straight away; the panel stays as a fallback with copy and edit.
      document.getElementById('compose-mailto').click();
      const title = document.getElementById('compose-title');
      compose.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      if (title) title.focus({ preventScroll: true });
    });

    const edit = document.getElementById('compose-edit');
    if (edit) {
      edit.addEventListener('click', () => {
        compose.hidden = true;
        form.elements.message.focus();
      });
    }
  }

  /* ---------- Pause control for the moving tool list ---------- */
  const marqueeToggle = document.querySelector('[data-marquee-toggle]');
  if (marqueeToggle) {
    const box = marqueeToggle.closest('.toolbox');
    const label = marqueeToggle.querySelector('[data-marquee-label]');
    const pauseIcon = marqueeToggle.querySelector('.mt-pause');
    const playIcon = marqueeToggle.querySelector('.mt-play');
    marqueeToggle.addEventListener('click', () => {
      const paused = !box.classList.contains('is-paused');
      box.classList.toggle('is-paused', paused);
      if (label) label.textContent = paused ? 'Play' : 'Pause';
      marqueeToggle.setAttribute('aria-label', paused ? 'Play the moving tool list' : 'Pause the moving tool list');
      if (pauseIcon) pauseIcon.hidden = paused;
      if (playIcon) playIcon.hidden = !paused;
    });
  }

  /* ---------- Local time in Aachen ---------- */
  const clock = document.querySelector('[data-clock]');
  if (clock && window.Intl) {
    try {
      const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin', timeZoneName: 'short' });
      const tick = () => { clock.textContent = fmt.format(new Date()); };
      tick();
      window.setInterval(tick, 30000);
    } catch (e) { /* keep static text */ }
  }

  /* ---------- Pointer glow on cards and the CTA band ---------- */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-glow]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
