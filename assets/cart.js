class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0, event);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends window.StandardEvents.createViewEventElement(HTMLElement) {
  constructor() {
    super();
    this.lineItemStatusElement =
      this.querySelector('#shopping-cart-line-item-status, #CartDrawer-LineItemStatus') ||
      document.getElementById('shopping-cart-line-item-status') ||
      document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', (event) => {
      if (this.tagName === 'CART-DRAWER-ITEMS') {
        debouncedOnChange.call(this, event);
        return;
      }

      this.onChange(event);
    });
  }

  cartUpdateUnsubscriber = undefined;
  pendingQuantityUpdates = new Map();
  pendingQuantityFlushTimer = null;
  quantitySyncInterval = 1000;

  static pendingCartDataPromise = null;

  connectedCallback() {
    // The factory base class auto-dispatches cart:view from the
    // `view-event-payload` attribute (Liquid filter output). The drawer
    // sets `view-event-trigger="manual"` to skip auto-dispatch.
    super.connectedCallback();

    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') return;
      return this.onCartUpdate();
    });
  }

  // Fetches the full cart shape (used to resolve the cart:lines-update event
  // promise after /cart/add.js, which only returns the added line — not the
  // post-mutation cart aggregates). De-duplicated across concurrent callers.
  static fetchCartData() {
    if (!CartItems.pendingCartDataPromise) {
      const pendingCartDataPromise = fetch(`${routes.cart_url}.json`)
        .then((response) => response.json())
        .catch(() => null)
        .finally(() => {
          if (CartItems.pendingCartDataPromise === pendingCartDataPromise) CartItems.pendingCartDataPromise = null;
        });

      CartItems.pendingCartDataPromise = pendingCartDataPromise;
    }
    return CartItems.pendingCartDataPromise;
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }

    if (this.pendingQuantityFlushTimer) {
      clearTimeout(this.pendingQuantityFlushTimer);
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`) || this.querySelector(`#Drawer-quantity-${id}`);
    if (!input) return;
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.queueQuantityUpdate({
        line: index,
        quantity: inputValue,
        name: document.activeElement?.getAttribute('name'),
        variantId: event.target.dataset.quantityVariantId,
        lineKey: event.target.dataset.quantityLineKey,
        previousQuantity: event.target.getAttribute('value'),
      });
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  queueQuantityUpdate(update) {
    this.pendingQuantityUpdates.set(update.line, update);

    const lineItem =
      document.getElementById(`CartItem-${update.line}`) || document.getElementById(`CartDrawer-Item-${update.line}`);
    if (lineItem) lineItem.classList.add('cart-item--pending');
    this.updateOptimisticTotals();

    if (this.pendingQuantityFlushTimer) return;

    this.pendingQuantityFlushTimer = setTimeout(() => {
      this.flushPendingQuantityUpdates();
    }, this.quantitySyncInterval);
  }

  flushPendingQuantityUpdates() {
    const updates = Array.from(this.pendingQuantityUpdates.values());
    this.pendingQuantityUpdates.clear();
    this.pendingQuantityFlushTimer = null;

    if (!updates.length) return;

    const cartPerformanceUpdateMarker = CartPerformance.createStartingMarker('change:batched-user-action');
    const cartItemsContainer =
      this.querySelector('#main-cart-items, #CartDrawer-CartItems') ||
      document.getElementById('main-cart-items') ||
      document.getElementById('CartDrawer-CartItems');
    if (cartItemsContainer) cartItemsContainer.classList.add('cart__items--updating');
    this.lineItemStatusElement.setAttribute('aria-hidden', false);

    const sectionsToRender = this.getSectionsToRender();
    const updateMap = updates.reduce((accumulator, update) => {
      const key = update.lineKey || update.variantId;
      if (key) accumulator[key] = update.quantity;
      return accumulator;
    }, {});

    const body = JSON.stringify({
      updates: updateMap,
      sections: [...new Set(sectionsToRender.map((section) => section.section))],
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => response.text())
      .then((state) => {
        const parsedState = JSON.parse(state);

        if (parsedState.errors) {
          this.rollbackPendingQuantityUpdates(updates);
          this.updateLiveRegions(updates[0].line, parsedState.errors);
          this.dispatchCartErrorEvent(parsedState.errors, 'INVALID');
          return;
        }

        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartDrawerWrapper = document.querySelector('cart-drawer');
        if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

        CartPerformance.measure('change:paint-batched-updated-sections', () => {
          const needsFullRender = this.hasServerAdjustedQuantities(updates, parsedState);
          const sectionsToPaint = needsFullRender
            ? sectionsToRender
            : sectionsToRender.filter(
                (section) =>
                  section.id !== 'main-cart-items' && section.id !== 'CartSummary' && section.id !== 'CartDrawer',
              );

          this.renderSections(sectionsToPaint, parsedState);
          this.updateLiveRegions(updates[0].line, '');

          const lastUpdate = updates[updates.length - 1];
          const lineItem =
            document.getElementById(`CartItem-${lastUpdate.line}`) ||
            document.getElementById(`CartDrawer-Item-${lastUpdate.line}`);
          const focusTarget = lineItem?.querySelector(`[name="${lastUpdate.name}"]`);
          if (focusTarget) focusTarget.focus();
        });

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState });
      })
      .catch((error) => {
        this.rollbackPendingQuantityUpdates(updates);
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        if (errors) errors.textContent = window.cartStrings.error;
        this.dispatchCartErrorEvent(window.cartStrings.error, 'SERVICE_UNAVAILABLE');
        console.error(error);
      })
      .finally(() => {
        updates.forEach((update) => {
          const lineItem =
            document.getElementById(`CartItem-${update.line}`) ||
            document.getElementById(`CartDrawer-Item-${update.line}`);
          lineItem?.classList.remove('cart-item--pending');
        });
        if (cartItemsContainer) cartItemsContainer.classList.remove('cart__items--updating');
        this.lineItemStatusElement.setAttribute('aria-hidden', true);
        CartPerformance.measureFromMarker('change:batched-user-action', cartPerformanceUpdateMarker);
      });
  }

  rollbackPendingQuantityUpdates(updates) {
    updates.forEach((update) => {
      const input =
        document.getElementById(`Quantity-${update.line}`) ||
        document.getElementById(`Drawer-quantity-${update.line}`);
      if (input && update.previousQuantity != null) input.value = update.previousQuantity;
    });
    this.updateOptimisticTotals();
  }

  hasServerAdjustedQuantities(updates, parsedState) {
    return updates.some((update) => {
      const item = parsedState.items.find((cartItem) => {
        if (update.lineKey) return cartItem.key === update.lineKey;
        return String(cartItem.variant_id) === String(update.variantId);
      });

      return !item || item.quantity !== update.quantity;
    });
  }

  formatWithDelimiters(number, precision = 2, thousands = ',', decimal = '.') {
    if (Number.isNaN(number) || number == null) return '0';

    const fixedNumber = (number / 100).toFixed(precision);
    const parts = fixedNumber.split('.');
    const dollars = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    const cents = parts[1] ? decimal + parts[1] : '';

    return dollars + cents;
  }

  formatCartMoney(cents, moneyFormat = this.dataset.moneyFormat) {
    if (moneyFormat) {
      const placeholder = moneyFormat.match(/\{\{\s*(\w+)\s*\}\}/)?.[1] || 'amount';
      let value;

      switch (placeholder) {
        case 'amount':
          value = this.formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = this.formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = this.formatWithDelimiters(cents, 2, '.', ',');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = this.formatWithDelimiters(cents, 0, '.', ',');
          break;
        case 'amount_with_space_separator':
          value = this.formatWithDelimiters(cents, 2, ' ', ',');
          break;
        case 'amount_no_decimals_with_space_separator':
          value = this.formatWithDelimiters(cents, 0, ' ', ',');
          break;
        case 'amount_with_apostrophe_separator':
          value = this.formatWithDelimiters(cents, 2, "'", '.');
          break;
        default:
          value = this.formatWithDelimiters(cents, 2);
      }

      return moneyFormat.replace(/\{\{\s*\w+\s*\}\}/, value);
    }

    const currency = this.dataset.currencyCode;
    if (!currency) return (cents / 100).toFixed(2);

    return new Intl.NumberFormat(document.documentElement.lang || undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
    }).format(cents / 100);
  }

  updateOptimisticTotals() {
    let subtotal = 0;

    this.querySelectorAll('[data-cart-item]').forEach((item) => {
      const quantityInput = item.querySelector('.quantity__input');
      const quantity = Math.max(parseInt(quantityInput?.value || '0', 10), 0);
      const unitPrice = parseInt(item.dataset.unitPrice || '0', 10);
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      item.querySelectorAll('[data-cart-line-total]').forEach((target) => {
        target.textContent = this.formatCartMoney(lineTotal);
      });
    });

    document.querySelectorAll('[data-cart-summary-subtotal], [data-cart-summary-total]').forEach((target) => {
      target.textContent = this.formatCartMoney(
        subtotal,
        this.dataset.summaryMoneyFormat || this.dataset.moneyFormat,
      );
    });
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    const sections = [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      }
    ];

    const cartSummary = document.getElementById('CartSummary');
    if (cartSummary) {
      sections.push({
        id: 'CartSummary',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '#CartSummary',
      });
    }

    const cartFooter = document.getElementById('main-cart-footer');
    if (cartFooter) {
      sections.push({
        id: 'main-cart-footer',
        section: cartFooter.dataset.id,
        selector: '.js-contents',
      });
    }

    return sections;
  }

  updateQuantity(line, quantity, event, name, variantId) {
    const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';
    const cartPerformanceUpdateMarker = CartPerformance.createStartingMarker(`${eventTarget}:user-action`);
    const quantityInput = this.querySelector(`#Quantity-${line}`) || this.querySelector(`#Drawer-quantity-${line}`);
    const previousQuantity = quantityInput?.getAttribute('value');

    this.enableLoading(line);

    const action = quantity === 0 ? 'remove' : 'update';
    const lineVariantId = variantId || quantityInput?.dataset.quantityVariantId;
    const lineKey = quantityInput?.dataset.quantityLineKey;
    const linesUpdateDeferred = this.createCartLinesUpdateEvent(action, lineVariantId, quantity, lineKey);

    // Cache sections before the fetch so we read dataset.id while elements still exist in the DOM
    const sectionsToRender = this.getSectionsToRender();

    const body = JSON.stringify({
      line,
      quantity,
      sections: [...new Set(sectionsToRender.map((section) => section.section))],
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        if (parsedState.errors) {
          this.dispatchCartErrorEvent(parsedState.errors, 'INVALID');
          linesUpdateDeferred?.reject(new Error(parsedState.errors));
        } else {
          this.resolveCartLinesUpdate(linesUpdateDeferred, parsedState);
        }

        CartPerformance.measure(`${eventTarget}:paint-updated-sections`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll('.cart-item');

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute('value');
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');
          const cartFooter = document.getElementById('main-cart-footer');

          if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.renderSections(sectionsToRender, parsedState);
          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = '';
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === 'undefined') {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper?.querySelector('.drawer__inner-empty')) {
            trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
          } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
          }
        });

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch((e) => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        if (quantityInput && previousQuantity != null) quantityInput.value = previousQuantity;
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        if (errors) errors.textContent = window.cartStrings.error;
        this.dispatchCartErrorEvent(window.cartStrings.error, 'SERVICE_UNAVAILABLE');
        linesUpdateDeferred?.reject(e);
      })
      .finally(() => {
        this.disableLoading(line);
        CartPerformance.measureFromMarker(`${eventTarget}:user-action`, cartPerformanceUpdateMarker);
      });
  }

  createCartLinesUpdateEvent(action, variantId, quantity, lineKey) {
    const { CartLinesUpdateEvent } = window.StandardEvents || {};
    if (!CartLinesUpdateEvent || !variantId) return null;
    // No AJAX line key on the row — likely cached HTML rendered before this
    // attribute landed. Skip dispatch rather than emit an event with id: ''.
    if (!lineKey) return null;

    const deferred = CartLinesUpdateEvent.createPromise();
    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action,
        context: 'cart',
        lines: [{ id: lineKey, quantity }],
        promise: deferred.promise,
      })
    );
    return deferred;
  }

  resolveCartLinesUpdate(deferred, parsedState) {
    if (!deferred) return;
    const { CartLinesUpdateEvent } = window.StandardEvents || {};
    if (!CartLinesUpdateEvent) return;

    deferred.resolve({ cart: CartLinesUpdateEvent.createCartFromAjaxResponse(parsedState) });
  }

  dispatchCartErrorEvent(message, code) {
    const { CartErrorEvent } = window.StandardEvents || {};
    if (!CartErrorEvent) return;
    this.dispatchEvent(new CartErrorEvent({ error: message, code }));
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      this.querySelector('#cart-live-region-text, #CartDrawer-LiveRegionText') ||
      document.getElementById('cart-live-region-text') ||
      document.getElementById('CartDrawer-LiveRegionText');
    if (!cartStatus) return;
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    const element = new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
    return element ? element.innerHTML : null;
  }

  renderSections(sectionsToRender, parsedState) {
    sectionsToRender.forEach((section) => {
      const target = document.getElementById(section.id);
      const sectionHTML = parsedState.sections[section.section];
      if (!target || !sectionHTML) return;

      const elementToReplace = target.querySelector(section.selector) || target;
      const sourceHTML = this.getSectionInnerHTML(sectionHTML, section.selector);
      if (sourceHTML !== null) elementToReplace.innerHTML = sourceHTML;
    });
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--updating');

    if (this.tagName !== 'CART-DRAWER-ITEMS') {
      this.lineItemStatusElement.setAttribute('aria-hidden', false);
      return;
    }

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled', 'cart__items--updating');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const newNote = event.target.value;
            const noteDeferred = this.dispatchNoteUpdateEvent(newNote);

            const body = JSON.stringify({ note: newNote });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
              .then((r) => r.json())
              .then((cart) => {
                if (!cart || cart.errors) {
                  throw Object.assign(new Error(cart?.errors), { code: 'INVALID' });
                }

                if (noteDeferred) {
                  const { CartNoteUpdateEvent } = window.StandardEvents || {};
                  if (CartNoteUpdateEvent) {
                    noteDeferred.resolve({ cart: CartNoteUpdateEvent.createCartFromAjaxResponse(cart) });
                  }
                }
                CartPerformance.measureFromEvent('note-update:user-action', event);
              })
              .catch((e) => {
                noteDeferred?.reject(e);
                const { CartErrorEvent } = window.StandardEvents || {};
                if (CartErrorEvent) {
                  this.dispatchEvent(
                    new CartErrorEvent({
                      error: e.message || 'Note update failed',
                      code: e.code || 'SERVICE_UNAVAILABLE',
                    })
                  );
                }
              });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }

      dispatchNoteUpdateEvent(newNote) {
        const { CartNoteUpdateEvent } = window.StandardEvents || {};
        if (!CartNoteUpdateEvent) return null;

        const context = this.closest('dialog') || this.closest('cart-drawer') ? 'dialog' : 'cart';
        const deferred = CartNoteUpdateEvent.createPromise();

        this.dispatchEvent(
          new CartNoteUpdateEvent({
            context,
            note: newNote,
            promise: deferred.promise,
          })
        );

        return deferred;
      }
    }
  );
}
