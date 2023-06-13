class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
      .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      }
    ];
  }

  async updateQuantity(line, quantity, name) {
    this.enableLoading(line);
    let itemsSize, bodyObj, stateObj, responseItemVariant;

    bodyObj = {
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    }

    const body = JSON.stringify(bodyObj);

    await fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        stateObj = parsedState;
        // console.log(parsedState);
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartFooter = document.getElementById('main-cart-footer');

        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

          elementToReplace.innerHTML =
            this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
        }));

        this.updateLiveRegions(line, parsedState.item_count);
        const lineItem =  document.getElementById(`CartItem-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) lineItem.querySelector(`[name="${name}"]`).focus();

        itemsSize = parsedState.items[0].properties.size
        
        this.disableLoading();
      }).catch(() => {
        this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
        document.getElementById('cart-errors').textContent = window.cartStrings.error;
        this.disableLoading();
      });

      if(stateObj.item_count === 0) {
        await cart_custom.renderCartItemsFee({is_shipping: false,message: "",price: null,price_taxed: null}, stateObj);  
        return;
      }
      console.log('---- addParamItemVariants');
      await cart_custom.addParamItemVariants(itemsSize, line, quantity);

      console.log('---- getInputShippingFee');
      const inputShippingFee = await cart_custom.createInputShippingFee(stateObj);
      console.log(inputShippingFee);

      console.log('---- getEstimateShippingFee');
      const estimateShippingFee = await cart_custom.getEstimateShippingFee(inputShippingFee);

      console.log('---- renderCartItemsFee');
      await cart_custom.renderCartItemsFee(estimateShippingFee, stateObj);

  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document.getElementById(`Line-item-error-${line}`)
        .querySelector('.cart-item__error-text')
        .innerHTML = window.cartStrings.quantityError.replace(
          '[quantity]',
          document.getElementById(`Quantity-${line}`).value
        );
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document.getElementById('main-cart-items').classList.add('cart__items--disabled');
    this.querySelectorAll(`#CartItem-${line} .loading-overlay`).forEach((overlay) => overlay.classList.remove('hidden'));
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    document.getElementById('main-cart-items').classList.remove('cart__items--disabled');
  }

}

customElements.define('cart-items', CartItems);

class EstimateShippingFeeButton extends HTMLElement {
  constructor() {
    super();
    this.estimateShippingFlg = true;
    this.addEventListener('click', async (event) => {

      if(!this.estimateShippingFlg) {
        console.log('no click !!! '+ 'estimateShippingFlg is '+ this.estimateShippingFlg);
        return false;
      }

      this.estimateShippingFlg = false;
      console.log('----start estimateShippingFlg is '+ this.estimateShippingFlg + '--------');

      event.preventDefault();
      
      // console.log('---- estimate button ---- addParamItemVariants');
      const stateObj = await cart_custom.getParamItemVariants();
      console.log(stateObj)
      if(stateObj.item_count === 0) {
        await cart_custom.renderCartItemsFee({is_shipping: false,message: "",price: null,price_taxed: null}, stateObj);  
        this.estimateShippingFlg = true;
        return;
      }
      // console.log('---- estimate button ---- getInputShippingFee');
      const inputShippingFee = await cart_custom.createInputShippingFee(stateObj);
      await cart_custom.addParamItemVariants(inputShippingFee.size);  // 送料計算のタイミングでカートを更新する
      console.log(inputShippingFee);
      // console.log('---- estimate button ---- getEstimateShippingFee');
      const estimateShippingFee = await cart_custom.getEstimateShippingFee(inputShippingFee);

      // console.log('---- estimate button ---- renderCartItemsFee');
      await cart_custom.renderCartItemsFee(estimateShippingFee, stateObj);

      console.log('----end estimateShippingFlg is '+ this.estimateShippingFlg + '--------');
      this.estimateShippingFlg = true;
      console.log('----end estimateShippingFlg is '+ this.estimateShippingFlg + '--------');

    });
  }
}

customElements.define('estimate-shipping-fee-button', EstimateShippingFeeButton);
