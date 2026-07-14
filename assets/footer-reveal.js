(() => {
  if (window.footerRevealInitialized) return;
  window.footerRevealInitialized = true;

  const desktopMedia = window.matchMedia('(min-width: 990px)');
  const root = document.documentElement;
  let footerSections = [];
  let footerObserver;
  let footerHeight = 0;
  let updateFrame;

  const setFooterInert = (isInert) => {
    footerSections.forEach((section) => section.toggleAttribute('inert', isInert));
  };

  const clearFooterOffsets = () => {
    footerSections.forEach((section) => section.style.removeProperty('--footer-reveal-offset'));
  };

  const updateFooterAccess = () => {
    updateFrame = undefined;
    if (!footerSections.length || !document.body.classList.contains('footer-reveal-enabled')) {
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
    if (!footerSections.length) return;

    let nextOffset = 0;
    for (let index = footerSections.length - 1; index >= 0; index -= 1) {
      const section = footerSections[index];
      section.style.setProperty('--footer-reveal-offset', `${nextOffset}px`);
      nextOffset += Math.ceil(section.getBoundingClientRect().height);
    }

    footerHeight = nextOffset;
    const canReveal = desktopMedia.matches && footerHeight > 0 && footerHeight < window.innerHeight * 0.9;

    document.body.classList.toggle('footer-reveal-enabled', canReveal);
    root.style.setProperty('--footer-reveal-height', canReveal ? `${footerHeight}px` : '0px');
    scheduleFooterAccessUpdate();
  };

  const initializeFooterReveal = () => {
    const nextFooterSections = Array.from(document.querySelectorAll('.shopify-section-group-footer-group'));
    if (!nextFooterSections.length) {
      setFooterInert(false);
      clearFooterOffsets();
      footerObserver?.disconnect();
      footerSections = [];
      document.body.classList.remove('footer-reveal-enabled');
      root.style.setProperty('--footer-reveal-height', '0px');
      return;
    }

    const footerSectionsChanged =
      nextFooterSections.length !== footerSections.length ||
      nextFooterSections.some((section, index) => section !== footerSections[index]);

    if (footerSectionsChanged) {
      setFooterInert(false);
      clearFooterOffsets();
      footerObserver?.disconnect();
      footerSections = nextFooterSections;
      footerObserver = new ResizeObserver(updateFooterReveal);
      footerSections.forEach((section) => footerObserver.observe(section));
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
