class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');
    this.summaryToggle = this.mainDetailsToggle.querySelector('summary');
    this.hoverMediaQuery = window.matchMedia('(min-width: 990px) and (hover: hover) and (pointer: fine)');
    this.closeHoverMenuTimeout = null;

    this.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  }

  isHoverableDesktop() {
    return this.hoverMediaQuery.matches;
  }

  onMouseEnter() {
    if (!this.isHoverableDesktop()) return;
    window.clearTimeout(this.closeHoverMenuTimeout);
    this.mainDetailsToggle.setAttribute('open', '');
    this.summaryToggle.setAttribute('aria-expanded', true);
  }

  onMouseLeave() {
    if (!this.isHoverableDesktop()) return;
    window.clearTimeout(this.closeHoverMenuTimeout);

    this.closeHoverMenuTimeout = window.setTimeout(() => {
      if (this.matches(':hover') || this.contains(document.activeElement)) return;
      this.close();
    }, 160);
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
