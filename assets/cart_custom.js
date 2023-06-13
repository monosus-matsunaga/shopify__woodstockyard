const SHIPPING_API_URL = '/apps/proxy/shipping_rate/app.php';
const $shippingPreConfirm = document.querySelector('#shippingPreConfirm');
$shippingPreConfirm.addEventListener('change', (event) => {
  console.log(event.currentTarget.value);
  if(event.currentTarget.value === 'true') {
    document.querySelector('#MainContent').classList.remove('quote-ng');
    document.querySelector('#MainContent').classList.add('quote-ok');
  }
  else if(event.currentTarget.value === 'false') {
    document.querySelector('#MainContent').classList.add('quote-ng');
    document.querySelector('#MainContent').classList.remove('quote-ok');
    document.querySelector('#MainContent').classList.remove('estimate-ok');
    document.querySelector('#resultRates').textContent = '----';
    document.querySelector('#shippingFeeOnTotal').textContent = '----';
    document.querySelector('#totalPriceOnTotal').textContent = '----';
    document.querySelector('#date').value = '';
    document.querySelector('#postalCode').value = '';
  } else {
    document.querySelector('#MainContent').classList.remove('quote-ng');
    document.querySelector('#MainContent').classList.remove('quote-ok');
    document.querySelector('#MainContent').classList.remove('estimate-ng');
    document.querySelector('#MainContent').classList.remove('estimate-ok');
    document.querySelector('#resultRates').textContent = '----';
    document.querySelector('#shippingFeeOnTotal').textContent = '----';
    document.querySelector('#totalPriceOnTotal').textContent = '----';
    document.querySelector('#date').value = '';
    document.querySelector('#postalCode').value = '';
  }
});

const $cartSubmitButton = document.querySelector('.cart__ctas');
$cartSubmitButton.addEventListener('click', (event) => {
  if(document.querySelector('#MainContent').classList.contains('estimate-ok')){
    console.log('estimate--ok');
    document.querySelector('#memoDateShipping').value = document.querySelector('#date').value;
  } else {
    console.log('estimate--ng');
    cart_custom.showQuote();
  }
  return true;
});

class cartCustom {
  errorShippingEstimate() {

  }

  showQuote(){
    alert('ご購入手続きに進むためには、送料をお見積もりください');
    document.scrollingElement.scrollTop = ( document.querySelector('#quoteArea').getBoundingClientRect().top + window.pageYOffset || document.documentElement.scrollTop ) - 84;
  }

  addParamItemVariants(_itemsSize) {
    const requestBody = {
      line: 1,
      quantity: document.querySelector('#Quantity-1').value,
      properties: {}
    };
    if(document.querySelector('#date').value) {
      requestBody.line = 1
      requestBody.properties = {
        'size': _itemsSize || 4,
        'deliveryDate': document.querySelector('#date').value.replace(/\//g, ''),
      }
    }
    fetch('./cart/change.js', {
      method: 'POST', 
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify(requestBody) 
    })
    .then(res=>res.json())
    .then((d) => {
      console.log('POST ./cart/change.js') 
      console.log(d)
    })
    .catch((e)=> { console.error('Error:', error); })

    return ;
  }

  async getParamItemVariants() {
    let itemVariants;
    await fetch('./cart.js')
    .then(res=>res.json())
    .then((data) => { 
      console.log('get ./cart.js') 
      console.log(data)
      itemVariants = data
    })
    .catch((e)=> { console.error('Error:', error); })
    return itemVariants
  }

  createInputShippingFee(_state) {
    const state = _state;
    const items = _state.items;
    const itemsSize = items.map(function (p) {
      return p.properties.size || 4;
    });
    var itemsMaxSize = itemsSize.reduce(function(a, b) {
      return Math.max(a, b);
    });
    console.log(itemsMaxSize);
    console.log(_state);

    return {
      'postalCode':	document.querySelector('#postalCode').value,
      'weight':	state.total_weight,
      'size':	itemsMaxSize,
      'deliveryDate':	document.querySelector('#date').value.replace(/\//g, ''),
    }
  }

  async getEstimateShippingFee(_createInputShippingFee) {
    let is_shipping = 'true';
    let result;
    if(!_createInputShippingFee['postalCode']) {
      is_shipping = 'false';
      alert('送料見積もりで郵便番号を入力してください');
    }
    if(!_createInputShippingFee['deliveryDate']) {
      is_shipping = 'false';
      alert('送料見積もりで希望配達日を入力してください');
    }
    
    const param = Object.keys(_createInputShippingFee).map(function(key){ return key+"="+ _createInputShippingFee[key] }).join("&");
    try {
    const res = await fetch([SHIPPING_API_URL, '?', param].join('') );
    const json = await res.json();
      console.log(`getEstimateShippingFee render ----> ${json}`);
    result = json;
    return result;   
    } catch(e) {
      console.error('Error:', e);
    }
  }

  renderCartItemsFee(_estimateShippingFee, _state) {
    
    const renderWeight = _state.item_count === 0 ? 0 : Math.ceil(_state.total_weight / 1000) ;
    if (!_estimateShippingFee['is_shipping']) {
      document.querySelector('#resultRates').textContent = '----';
      document.querySelector('#shippingFeeOnTotal').textContent = '----';
      document.querySelector('#totalPriceOnTotal').textContent = '----';
      document.querySelector('#MainContent').classList.add('estimate-ng');
      document.querySelector('#MainContent').classList.remove('estimate-ok');
      document.querySelector('#weight').textContent = renderWeight.toLocaleString();
      return;
    }
    document.querySelector('#MainContent').classList.add('estimate-ok');
    document.querySelector('#MainContent').classList.remove('estimate-ng');
    const state = _state;
    console.log('---- renderCartItems--Weight');
    document.querySelector('#weight').textContent = renderWeight.toLocaleString();
    const renderShippingFee = _estimateShippingFee['price_taxed'] * 1;
    document.querySelector('#resultRates').textContent = '¥' + renderShippingFee.toLocaleString();
    document.querySelector('#shippingFeeOnTotal').textContent = '¥' + renderShippingFee.toLocaleString();
    console.log('---- renderCartItems--Total');
    const renderTotalPrice = state.total_price / 100 + _estimateShippingFee['price_taxed'] * 1;
    document.querySelector('#totalPriceOnTotal').textContent = '¥' + renderTotalPrice.toLocaleString();
  }
}
class CartQuantityOption {
  deactivater(event){
    if(event.key === 'Enter'){
      event.preventDefault();
      return false;
    }
    return true;
  }
}

class CartValidate {
  alertZipCode(zipCode) {
    if(!this.checkZipCode(zipCode)) {
      document.querySelector('#MainContent').classList.add('validate-postal-ng');
    }
    else {
      document.querySelector('#MainContent').classList.remove('validate-postal-ng');
    }
  }

  checkZipCode(zipCode) {
    var zipCodeRegExp = /^(\d{3}-\d{4}|\d{7})$/;
    return zipCodeRegExp.test(zipCode);
  }
}
const cart_quantity_option = new CartQuantityOption();
const cart_validate = new CartValidate;
const cart_custom = new cartCustom;