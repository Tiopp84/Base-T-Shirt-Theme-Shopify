if (!window.sizeGuideEventsBound) {
  window.sizeGuideEventsBound = true;

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

    const openButton = event.target.closest('.size-guide__button');
    if (openButton) {
      const dialogId = openButton.getAttribute('aria-controls');
      const dialog = dialogId ? document.getElementById(dialogId) : null;

      if (dialog) {
        dialog.showModal();
        openButton.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const dialog = event.target.closest('.size-guide__modal');
    if (dialog && event.target === dialog) dialog.close();
  });

  document.addEventListener(
    'close',
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.matches('.size-guide__modal')) return;

      const button = document.querySelector(`[aria-controls="${CSS.escape(event.target.id)}"]`);
      button?.setAttribute('aria-expanded', 'false');
    },
    true
  );
}
