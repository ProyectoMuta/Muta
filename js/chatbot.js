(() => {
  function $(sel, ctx=document){ return ctx.querySelector(sel); }
  function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }

  // Esperar a que el bloque esté en el DOM (por si se carga con fetch)
  const ready = () => new Promise(res => {
    if ($('#chatbot-toggle')) return res();
    const obs = new MutationObserver(() => {
      if ($('#chatbot-toggle')) { obs.disconnect(); res(); }
    });
    obs.observe(document.body, { childList:true, subtree:true });
  });

  ready().then(() => {
    const toggle = $('#chatbot-toggle');
    const dialog = $('#chatbot-dialog');
    const overlay = $('#chatbot-overlay');
    const closeBtn = $('#chatbot-close');

    const open = () => {
      overlay.hidden = false;
      dialog.hidden = false;
      requestAnimationFrame(()=> dialog.classList.add('is-open'));
      toggle.setAttribute('aria-expanded','true');
      show('menu');
    };
    const close = () => {
      dialog.classList.remove('is-open');
      toggle.setAttribute('aria-expanded','false');
      setTimeout(()=>{ overlay.hidden = true; dialog.hidden = true; }, 180);
    };
    const show = (name) => {
      $all('.chatbot-view').forEach(v => {
        const isTarget = v.dataset.view === name;
        v.hidden = !isTarget;
      });
    };

    toggle.addEventListener('click', () => (dialog.hidden ? open() : close()));
    overlay.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    dialog.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-goto]');
      if (btn) show(btn.dataset.goto);
      if (e.target.classList.contains('chatbot-back')) show('menu');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !dialog.hidden) close();
    });
  });
})();
