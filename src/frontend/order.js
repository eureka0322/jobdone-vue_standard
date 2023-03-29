import Vue from 'vue';
import axios from 'axios';

import storeInstance from './store';


let stripe, stripeElements, stripeCardNumber, stripeCardCvc, stripeCardExpiry;

const stripeElementsStyles = {
    base: {
        color: '#a3a3a3',
        fontWeight: 600,
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontSize: '16px',
        padding: '1em',
        fontSmoothing: 'antialiased',
        ':focus': { color: '#424770' },
        '::placeholder': { color: '#9BACC8' },
        ':focus::placeholder': { color: '#CFD7DF' }
    },
    invalid: {
        color: '#a3a3a3',
        ':focus': { color: '#FA755A' },
        '::placeholder': { color: '#FFCCA5' }
    }
};

const stripeElementsClasses = {
    focus: 'focus',
    empty: 'empty',
    invalid: 'invalid'
};

const orderApp = new Vue({
    data: {
        sharedState: storeInstance.state,

        extrasSelected: {},
        extras: [],
        extrasPrice: 0,

        productPrice: 0,
        orderFee: 0,
        totalPrice: 0,
        totalPriceWithCoupon: 0,
        canOrderWithCredit: false,

        coupon: '',
        couponError: null,
        couponSuccess: false,
        couponValue: 0,

        notEnoughBalanceError: null,

        isLoading: false,
        success: null,
        error: null,
        currentStep: 0,

        cardEmail: '',
        cardComplete: false,
        cardError: null,
        cardRemember: true,

        paymentMethod: 'card'
    },
    mounted: function() {
        let extrasSelected = {};
        this.sharedState.extra.selected_product_extras.forEach(extra => extrasSelected[extra.id] = 1);

        this.sharedState.extra.product_extras.forEach(extra => {
            this.extras.push(Object.assign({}, extra, { selected: extra.id in extrasSelected }));
        });

        if (this.sharedState.extra.selected_discount_code) {
            this.coupon = this.sharedState.extra.selected_discount_code;
            this.handleApplyCouponClick();
        }

        this.productPrice = this.sharedState.extra.product_price;
        this.orderFee = this.sharedState.extra.order_fee;
        this.totalPrice = this.productPrice + Math.round(this.productPrice * this.orderFee);
        this.canOrderWithCredit = (this.sharedState.user && this.totalPrice <= this.sharedState.user.credit);

        if (Object.keys(extrasSelected).length) {
            this.handleExtraSelectionChange();
        }

        stripe = Stripe(this.sharedState.extra.stripe_key);
        stripeElements = stripe.elements();

        stripeCardNumber = stripeElements.create('cardNumber', {
            style: stripeElementsStyles,
            classes: stripeElementsClasses
        });

        stripeCardCvc = stripeElements.create('cardCvc', {
            style: stripeElementsStyles,
            classes: stripeElementsClasses
        });

        stripeCardExpiry = stripeElements.create('cardExpiry', {
            style: stripeElementsStyles,
            classes: stripeElementsClasses
        });

        stripeCardNumber.mount(this.$refs.stripeCardNumberElement);
        stripeCardCvc.mount(this.$refs.stripeCardCvcElement);
        stripeCardExpiry.mount(this.$refs.stripeCardExpiryElement);

        stripeCardNumber.addEventListener('change', evt => {
            this.cardError = evt.error ? evt.error.message : null;
            this.cardComplete = !!evt.complete;
        });

        let elementsCompleted = [false, false, false];

        [stripeCardNumber, stripeCardCvc, stripeCardExpiry].forEach((element, idx) => {
            element.on('change', evt => {
                // this.cardError = evt.error ? evt.error.message : null;
                elementsCompleted[idx] = evt.complete;
                this.cardComplete = elementsCompleted.every(item => item);
            });
        });

        if (this.sharedState.user) {
            this.cardEmail = this.sharedState.user.email;
            this.paymentMethod = 'balance';
        }

        if (window.dataLayer) {
            dataLayer.push({
                'event': 'checkout',
                'ecommerce': this.gtmCreateCheckoutData()
            });
        }
    },
    methods: {
        handleExtraSelectionChange: function() {
            let extrasPrice = 0,
                extrasSelected = {};

            this.extras.forEach(extra => {
                if (!extra.selected) {
                    return;
                }

                extrasPrice += extra.price;
                extrasSelected[extra.id] = 1;
            });

            let fnCalculateWithFee = amount => amount + Math.round(amount * this.orderFee);

            this.totalPrice = fnCalculateWithFee(this.productPrice + extrasPrice);
            this.totalPriceWithCoupon = fnCalculateWithFee(Math.max(this.productPrice - this.couponValue, 0) + extrasPrice);
            this.extrasSelected = extrasSelected;
            this.canOrderWithCredit = (this.sharedState.user && this.totalPrice <= this.sharedState.user.credit);
        },
        handleApplyCouponClick: function() {
            if (!this.coupon) {
                return;
            }

            let data = {
                discount: this.coupon
            };

            this.isLoading = true;
            this.couponError = null;
            this.couponValue = 0;
            axios.post('/api/order/' + this.sharedState.extra.product.id + '/verify', data).then(res => {
                this.isLoading = false;
                this.couponValue = res.data.discount_value;

                this.handleExtraSelectionChange();
            }).catch(err => {
                this.isLoading = false;
                if (err.response && err.response.status === 400) {
                    this.couponError = 'Coupon code either expired or not found';
                } else {
                    this.couponError = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                }
            });
        },
        handleOrderClick: function() {
            if (this.isLoading || !this.sharedState.user) {
                return;
            }

            if (this.totalPrice > this.sharedState.user.credit) {
                this.notEnoughBalanceError = true;
                return;
            } else {
                this.notEnoughBalanceError = false;
            }

            let data = {
                extras: Object.keys(this.extrasSelected)
            };

            if (this.couponValue) {
                data.discount = this.coupon;
            }

            if (this.sharedState.extra.enquiry_offer_id) {
                data.enquiry_offer_id = this.sharedState.extra.enquiry_offer_id;
            }

            let fnCallback = url => {
                // Redirect user to the order page
                window.location.href = url;
            };

            this.isLoading = true;
            axios.post('/api/order/' + this.sharedState.extra.product.id, data).then(res => {
                if (window.dataLayer) {
                    dataLayer.push({
                        'event': 'purchase',
                        'ecommerce': this.gtmCreatePurchaseData(res.data),
                        'eventCallback': fnCallback.bind(null, res.data._url)
                    });
                } else {
                    fnCallback(res.data._url)
                }
            }).catch(err => {
                this.isLoading = false;
                
                if (err.response && err.response.data.error) {
                    this.error = err.response.data.error.message;
                } else {
                    this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                }
            });
        },
        handleStripePayment: function() {
            this.isLoading = true;

            stripe.createSource(stripeCardNumber).then(result => {
                if (result.error) {
                    // Inform the user if there was an error
                    this.isLoading = false;
                    this.error = result.error.message;
                    return;
                }

                if (['optional', 'required'].indexOf(result.source.card.three_d_secure) === -1) {
                    // Card doesn't support 3D secure
                    this.isLoading = false;
                    this.error = 'Dear customer! Unfortunately, your card doesn\'t support 3D Secure. We require 3D Secure to be enabled due to increased number of fraudulent transactions';
                    return;
                }

                let data = {
                    stripeSource: result.source.id,
                    stripeEmail: this.cardEmail,
                    remember: this.cardRemember,
                    extras: Object.keys(this.extrasSelected)
                };

                if (this.couponValue) {
                    data.discount = this.coupon;
                }

                if (this.sharedState.extra.enquiry_offer_id) {
                    data.enquiry_offer_id = this.sharedState.extra.enquiry_offer_id;
                }

                axios.post('/api/order/' + this.sharedState.extra.product.id, data).then(res => {
                    location.href = res.data._redirect_url;
                }).catch(res => {
                    this.isLoading = false;
                    // TODO
                    this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                });
            });
        },
        gtmCreateCheckoutData: function() {
            return {
                'checkout': {
                    'actionField': {'step': 1},
                    'products': [{
                      'name': this.sharedState.extra.product.title,
                      'id': this.sharedState.extra.product.id,
                      'price': (this.totalPriceWithCoupon / 100).toFixed(2),
                      'brand': this.sharedState.extra.product._seller,
                      'category': this.sharedState.extra.product.category_id,
                      'quantity': 1
                    }]
                }
            };
        },
        gtmCreatePurchaseData: function(data) {
            return {
                'purchase': {
                    'actionField': {
                        'id': data.id,
                        'revenue': (this.totalPriceWithCoupon / 100).toFixed(2),
                        'coupon': this.coupon
                    },
                    'products': [{
                      'name': this.sharedState.extra.product.title,
                      'id': this.sharedState.extra.product.id,
                      'price': (this.totalPriceWithCoupon / 100).toFixed(2),
                      'brand': this.sharedState.extra.product._seller,
                      'category': this.sharedState.extra.product.category_id,
                      'quantity': 1
                    }]
                }
            };
        }
    }
});


export default orderApp;
