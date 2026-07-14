(() => {
  if (window.footerRevealInitialized) return;
  window.footerRevealInitialized = true;

  const desktopMedia = window.matchMedia('(min-width: 990px)');
  const root = document.documentElement;
  let footerGroup;
  let footerObserver;
  let footerHeight = 0;
  let updateFrame;

  const setFooterInert = (isInert) => {
    if (!footerGroup) return;
    footerGroup.toggleAttribute('inert', isInert);
  };

  const updateFooterAccess = () => {
    updateFrame = undefined;
    if (!footerGroup || !document.body.classList.contains('footer-reveal-enabled')) {
      setFooterInert(false);
      return;
    }

    const revealStart = document.documentElement.scrollHeight - footerHeight;
    const viewportBottom = window.scrollY + window.innerHeight;
    setFooterInert(viewportBottom < revealStart - 1);
  };

  const scheduleFooterAccessUpdate = () => {
    if (updateFrame) return;
    updateFrame = window.requestAnimationFrame(updateFooterAccess);
  };

  const updateFooterReveal = () => {
    if (!footerGroup) return;

    footerHeight = Math.ceil(footerGroup.getBoundingClientRect().height);
    const canReveal = desktopMedia.matches && footerHeight > 0 && footerHeight < window.innerHeight * 0.9;

    document.body.classList.toggle('footer-reveal-enabled', canReveal);
    root.style.setProperty('--footer-reveal-height', canReveal ? `${footerHeight}px` : '0px');
    scheduleFooterAccessUpdate();
  };

  const initializeFooterReveal = () => {
    const nextFooterGroup = document.querySelector('.shopify-section-group-footer-group');
    if (!nextFooterGroup) {
      document.body.classList.remove('footer-reveal-enabled');
      root.style.setProperty('--footer-reveal-height', '0px');
      setFooterInert(false);
      return;
    }

    if (nextFooterGroup !== footerGroup) {
      setFooterInert(false);
      footerObserver?.disconnect();
      footerGroup = nextFooterGroup;
      footerObserver = new ResizeObserver(updateFooterReveal);
      footerObserver.observe(footerGroup);
    }

    updateFooterReveal();
  };

  window.addEventListener('scroll', scheduleFooterAccessUpdate, { passive: true });
  window.addEventListener('resize', updateFooterReveal, { passive: true });
  desktopMedia.addEventListener('change', updateFooterReveal);
  document.addEventListener('shopify:section:load', initializeFooterReveal);
  document.addEventListener('shopify:section:unload', () => window.requestAnimationFrame(initializeFooterReveal));

  initializeFooterReveal();
})();
