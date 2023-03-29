import Promise from 'promise-polyfill';
import Vue from 'vue';
import axios from 'axios';
import Raven from 'raven-js';
import RavenVue from 'raven-js/plugins/vue';

import storeInstance from '../frontend/store';
import messagingInstance from '../shared/messaging';
import accountHeaderApp from './header';
import accountBuyerApp from './buyer';
import accountSellerApp from './seller';
import accountServiceApp from './service';
import accountServicesApp from './services';
import accountOrderRequirementsApp from './orderRequirements';
import accountOrderApp from './order';
import accountInboxApp from './inbox';
import accountSettingsApp from './settings';
import accountBalanceApp from './balance';
import accountEarningsApp from './earnings';
import accountDiscountsApp from './discounts';
import accountAffiliateApp from './affiliate';
import accountDashboardApp from './dashboard';
import accountFavoritesApp from './favorites';
import './style/index.scss';


// Installing Promise polyfill
if (!window.Promise) {
    window.Promise = Promise;
}

// Add custom header to every XHR request
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';


if (window.SM_BOOTSTRAP_DATA) {
    storeInstance.bootstrap(window.SM_BOOTSTRAP_DATA);

    if (storeInstance.state.config.sentry) {
        // Install Raven
        
        let raven = Raven.config(
            storeInstance.state.config.sentry.dsn, { debug: true }
        ).addPlugin(RavenVue, Vue).install();

        window.onunhandledrejection = function(evt) {
            Raven.captureException(evt.reason);
        };
    }

    if (storeInstance.state.user && storeInstance.state.config.messaging) {
        messagingInstance.init(storeInstance.state.config.messaging.server, storeInstance.state.user);
    }
}


accountHeaderApp.$mount('#sm-account-header');

if (document.getElementById('sm-account-buyer')) {
    accountBuyerApp.$mount('#sm-account-buyer');
}

if (document.getElementById('sm-account-seller')) {
    accountSellerApp.$mount('#sm-account-seller');
}

if (document.getElementById('sm-account-service')) {
    accountServiceApp.$mount('#sm-account-service');
}

if (document.getElementById('sm-account-services')) {
    accountServicesApp.$mount('#sm-account-services');
}

if (document.getElementById('sm-account-order-requirements')) {
    accountOrderRequirementsApp.$mount('#sm-account-order-requirements');
}

if (document.getElementById('sm-account-order')) {
    accountOrderApp.$mount('#sm-account-order');
}

if (document.getElementById('sm-account-inbox')) {
    accountInboxApp.$mount('#sm-account-inbox');
}

if (document.getElementById('sm-account-settings')) {
    accountSettingsApp.$mount('#sm-account-settings');
}

if (document.getElementById('sm-account-balance')) {
    accountBalanceApp.$mount('#sm-account-balance');
}

if (document.getElementById('sm-account-earnings')) {
    accountEarningsApp.$mount('#sm-account-earnings');
}

if (document.getElementById('sm-account-discounts')) {
    accountDiscountsApp.$mount('#sm-account-discounts');
}

if (document.getElementById('sm-account-affiliate')) {
    accountAffiliateApp.$mount('#sm-account-affiliate');
}

if (document.getElementById('sm-account-dashboard')) {
    accountDashboardApp.$mount('#sm-account-dashboard');
}

if (document.getElementById('sm-account-favorites')) {
    accountFavoritesApp.$mount('#sm-account-favorites');
}


const DISPUTE_KINDS_BUYER = [
    { kind: 'cant_do', label: 'The seller can’t do this job' },
    { kind: 'reorder', label: 'I need to reorder from this seller' },
    { kind: 'price', label: 'We couldn’t agree on the price' },
    { kind: 'no_response', label: 'The seller is not responding' },
    { kind: 'other', label: 'Other' }
];

const DISPUTE_KINDS_SELLER = [
    { kind: 'no_info', label: 'I didn\'t receive enough information from the buyer' },
    { kind: 'reorder', label: 'The buyer is going to reorder' },
    { kind: 'extra_work', label: 'The buyer requested extra work which has not been offered' },
    { kind: 'not_able', label: 'I\'am not able to do this job' },
    { kind: 'price', label: 'We couldn’t agree on the price' },
    { kind: 'personal', label: 'Due to personal/technical reasons, I cannot complete the work' },
    { kind: 'no_response', label: 'The buyer is not responding' },
    { kind: 'other', label: 'Other' }
];


if (document.getElementById('sm-account-order-dispute')) {
    new Vue({
        el: '#sm-account-order-dispute',
        data: {
            sharedState: storeInstance.state,

            disputeKinds: [],

            kind: null,
            step: 1,

            dispute: {
                text: ''
            },

            error: null,
            loading: false,
            sent: false
        },
        mounted: function() {
            if (this.sharedState.extra.mode === 'buyer') {
                this.disputeKinds = DISPUTE_KINDS_BUYER;
            } else {
                this.disputeKinds = DISPUTE_KINDS_SELLER;
            }
        },
        methods: {
            handleSendClick: function() {
                let data = Object.assign({ kind: this.kind.kind }, this.dispute);

                this.loading = true;
                this.error = null;
                axios.post('/api/account/' + this.sharedState.extra.mode + '/orders/' + this.sharedState.extra.order.id + '/dispute', data).then(res => {
                    this.loading = false;
                    this.sent = true;
                    window.location.href = storeInstance.urlFor('order', [this.sharedState.extra.order.id]);
                }).catch(err => {
                    this.loading = false;
                    if (err.response && err.response.status === 400) {
                        this.error = 'Please check that you provided all necessary informartion requested by service provider';
                    } else {
                        this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                    }
                });
            }
        }
    });
}

if (document.getElementById('sm-account-order-review')) {
    new Vue({
        el: '#sm-account-order-review',
        data: {
            sharedState: storeInstance.state,

            orderReviewFeedback: '',
            orderReviewRate: '0',

            error: null,
            loading: false,
            sent: false
        },
        methods: {
            handleRateOrderClick: function() {
                let data = {
                    text: this.orderReviewFeedback,
                    rating: +this.orderReviewRate
                };

                this.loading = true;
                this.error = null;
                axios.post('/api/account/' + this.sharedState.extra.mode + '/orders/' + this.sharedState.extra.order.id + '/feedback', data).then(resp => {
                    this.sent = true;
                    this.loading = false;
                }).catch(err => {
                    this.loading = false;
                    this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                });
            }
        }
    });
}

if (document.getElementById('sm-become-premium')) {
    new Vue({
        el: '#sm-become-premium',
        data: {
            useCoupon: false
        },
        mounted: function() {
            this.useCoupon = storeInstance.state.extra.use_coupon;
        }
    });
}
