import Vue from 'vue';
import { modal } from 'vue-strap';
import fecha from 'fecha';
import axios from 'axios';

import Spinner from '../shared/components/spinner';
import storeInstance from '../frontend/store';


let stripe, stripeCard;

const TRANSACTIONS_ON_PAGE = 10;

const accountBalanceApp = new Vue({
    components: {
        modal,
        Spinner
    },
    data: {
        sharedState: storeInstance.state,

        transactionsLoading: false,
        transactions: [],
        transactionType: 'all',

        depositDropdown: false,

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],

        transferModal: {
            show: false,
            recipient: '',
            amount: '',
            note: '',
            error: null,
            loading: false,
            success: false
        },

        depositCardModal: {
            show: false,
            amount: '',
            error: null,
            loading: false,
            success: false,

            selectedCard: null,
            cards: [],
            cardsLoading: false,
            rememberNewCard: false,
            newCardError: null,
            newCardComplete: false
        },

        depositBitcoinModal: {
            show: false,
            error: null,
            loading: false,
            address: null
        },

        withdrawBitcoinModal: {
            show: false,
            address: '',
            amount: '',
            error: null,
            loading: false,
            success: false
        },

        withdrawPayPalModal: {
            show: false,
            address: '',
            amount: '',
            error: null,
            loading: false,
            success: false
        }
    },
    mounted: function() {
        this.fetchTransactions();

        this.$watch('transactionType', () => {
            this.fetchTransactions();
        });

        stripe = Stripe(this.sharedState.extra.stripe_key);
        stripeCard = stripe.elements().create('card', { style: {
            base: {
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontWeight: '300',
                fontSize: '16px',
                lineHeight: '20px',
                '::placeholder': {
                    color: '#9aa7b4'
                }
            }
        }});
        
        stripeCard.mount(this.$refs.stripeCardElement);
        stripeCard.addEventListener('change', evt => {
            this.depositCardModal.newCardError = evt.error ? evt.error.message : null;
            this.depositCardModal.newCardComplete = !!evt.complete;
        });
    },
    methods: {
        fetchTransactions: function(page = 1) {
            let params = {
                limit: TRANSACTIONS_ON_PAGE,
                offset: (page - 1) * TRANSACTIONS_ON_PAGE,
                type: this.transactionType
            };

            this.transactionsLoading = true;
            axios.get(`/api/account/balance/transactions`, { params: params }).then(resp => {
                this.transactionsLoading = false;
                this.transactions = resp.data.data.map(transaction => {
                    transaction.created_on = transaction.created_on ? fecha.format(new Date(transaction.created_on), 'MMM D, YYYY h:mm A') : '-';

                    switch (transaction.type) {
                        case 'deposit':
                        case 'deposit_nofee':
                            transaction._transaction = 'Deposit';
                            break;

                        case 'withdrawal':
                            transaction._transaction = 'Withdrawal';
                            if (transaction.note) {
                                transaction._transaction += ' (' + transaction.note + ')';
                            }
                            break;

                        case 'order_hold':
                            transaction._transaction = 'Hold for the order #' + transaction.order_id;
                            transaction._order_url = storeInstance.urlFor('order', [transaction.order_id]);
                            break;

                        case 'order_release':
                            transaction._transaction = 'Income for the order #' + transaction.order_id;
                            transaction._order_url = storeInstance.urlFor('order', [transaction.order_id]);
                            break;

                        case 'order_moneyback':
                            transaction._transaction = 'Moneyback for the order #' + transaction.order_id;
                            transaction._order_url = storeInstance.urlFor('order', [transaction.order_id]);
                            break;

                        case 'fee':
                            if (transaction.order_id) {
                                transaction._transaction = 'Processing fee for the order #' + transaction.order_id;
                                transaction._order_url = storeInstance.urlFor('order', [transaction.order_id]);
                            } else {
                                transaction._transaction = 'Fee';
                            }
                            break;

                        case 'seller_fee':
                            transaction._transaction = 'Seller fee';
                            break;

                        case 'premium_member_fee':
                            transaction._transaction = 'Premium member fee';
                            break;

                        case 'transfer_income':
                        case 'transfer_outcome':
                            transaction._transaction = 'Transfer';
                            break;

                        case 'feature':
                            transaction._transaction = 'Featuring service';
                            console.log(transaction);
                            break;

                        case 'affiliate_comission':
                            transaction._transaction = 'Affiliate comission';
                            break;
                    }

                    return transaction;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / TRANSACTIONS_ON_PAGE),
                startingPage = this.currentPage < 3 ? 1 : this.currentPage - 2,
                newPages = [];

            for (let i = 0; i < 5; i++) {
                if (startingPage + i > totalPages) {
                    break;
                }

                newPages.push(startingPage + i);
            }

            this.pages = newPages;
        },
        handlePageSelect: function(page) {
            if (Math.ceil(this.totalResults / TRANSACTIONS_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchTransactions(page);
        },
        handleDepositCardClick: function() {
            this.depositCardModal = {
                show: true,
                amount: '',
                error: null,
                loading: false,
                success: false,

                selectedCard: null,
                cards: [],
                cardsLoading: true,
                rememberNewCard: false,

                newCardError: null,
                newCardComplete: false
            };

            axios.get('/api/account/balance/deposit/card/cards').then(resp => {
                this.depositCardModal.cards = resp.data;
                this.depositCardModal.cardsLoading = false;

                if (!resp.data.length) {
                    this.depositCardModal.selectedCard = 'new';
                } else if (resp.data.length === 1) {
                    this.depositCardModal.selectedCard = resp.data[0].id;
                }
            });
        },
        handleDepositCardProcess: function() {
            if (this.depositCardModal.selectedCard === 'new' && this.depositCardModal.newCardError) {
                this.depositCardModal.error = this.depositCardModal.newCardError;
                return;
            }

            if (isNaN(this.depositCardModal.amount) || +this.depositCardModal.amount < 1 || this.depositCardModal.amount > 25) {
                this.depositCardModal.error = 'Please enter correct amount';
            }

            this.depositCardModal.error = null;
            this.depositCardModal.loading = true;

            let fnSendRequest = (stripeSource, existing) => {
                let data = {
                    amount: this.depositCardModal.amount,
                    remember: this.depositCardModal.rememberNewCard,
                    stripeSource: stripeSource,
                    existing: !!existing
                };

                axios.post('/api/account/balance/deposit/card', data).then(res => {
                    this.depositCardModal.success = true;
                    this.depositCardModal.loading = false;
                }).catch(err => {
                    this.depositCardModal.loading = false;

                    if (err.response.data.error && err.response.data.error.message) {
                        this.depositCardModal.error = err.response.data.error.message;
                    } else {
                        this.depositCardModal.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                    }
                });
            };

            if (this.depositCardModal.selectedCard === 'new') {
                stripe.createSource(stripeCard).then(result => {
                    if (result.error) {
                        // Inform the user if there was an error
                        this.depositCardModal.loading = false;
                        this.depositCardModal.error = result.error.message;
                        return;
                    }

                    fnSendRequest(result.source.id);
                });
            } else {
                fnSendRequest(this.depositCardModal.selectedCard, true);
            }
        },
        handleTransferFundsClick: function() {
            this.transferModal = {
                show: true,
                recipient: '',
                amount: '',
                note: '',
                error: null,
                loading: false,
                success: false
            };
        },
        handleDepositBitcoinClick: function() {
            this.depositBitcoinModal = {
                show: true,
                error: null,
                loading: true,
                address: null
            };

            axios.post('/api/account/balance/deposit/btc').then(res => {
                this.depositBitcoinModal.loading = false;
                this.depositBitcoinModal.error = null;
                this.depositBitcoinModal.address = res.data.address;
            }).catch(res => {
                this.depositBitcoinModal.loading = false;
                this.depositBitcoinModal.error = true;
            });
        },
        handleWithdrawBitcoinClick: function() {
            this.withdrawBitcoinModal = {
                show: true,
                address: '',
                amount: '',
                error: null,
                loading: false,
                success: false
            };
        },
        handleWithdrawPayPalClick: function() {
            this.withdrawPayPalModal = {
                show: true,
                address: '',
                amount: '',
                error: null,
                loading: false,
                success: false
            };
        },
        handleTransferFundsProcess: function() {
            let data = {
                recipient: this.transferModal.recipient,
                amount: this.transferModal.amount,
                note: this.transferModal.note
            };

            if (!data.recipient) {
                this.transferModal.error = 'Username is required';
                return;
            }

            if (!data.amount || isNaN(data.amount) || +data.amount < 0) {
                this.transferModal.error = 'Please enter valid amount';
                return;
            }

            this.transferModal.loading = true;
            this.transferModal.error = null;
            axios.post('/api/account/balance/transfer', data).then(res => {
                this.transferModal.loading = false;
                this.transferModal.error = null;
                this.transferModal.success = true;
            }).catch(res => {
                this.transferModal.loading = false;

                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;
                    if (fields && fields.recipient) {
                        this.transferModal.error = fields.recipient.join('\n');
                        return;
                    }

                    if (fields && fields.amount) {
                        this.transferModal.error = fields.amount.join('\n');
                        return;
                    }
                }

                this.transferModal.error = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleWithdrawBitcoinProcess: function() {
            let data = {
                address: this.withdrawBitcoinModal.address,
                amount: this.withdrawBitcoinModal.amount
            };

            if (!data.address) {
                this.withdrawBitcoinModal.error = 'Address is required';
                return;
            }

            if (!data.amount || isNaN(data.amount) || +data.amount < 0) {
                this.withdrawBitcoinModal.error = 'Please enter valid amount';
                return;
            }

            this.withdrawBitcoinModal.loading = true;
            this.withdrawBitcoinModal.error = null;
            axios.post('/api/account/balance/withdraw/btc', data).then(res => {
                this.withdrawBitcoinModal.loading = false;
                this.withdrawBitcoinModal.error = null;
                this.withdrawBitcoinModal.success = true;
            }).catch(res => {
                this.withdrawBitcoinModal.loading = false;

                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;
                    if (fields && fields.address) {
                        this.withdrawBitcoinModal.error = fields.address.join('\n');
                        return;
                    }

                    if (fields && fields.amount) {
                        this.withdrawBitcoinModal.error = fields.amount.join('\n');
                        return;
                    }
                }

                this.withdrawBitcoinModal.error = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleWithdrawPayPalProcess: function() {
            let data = {
                address: this.withdrawPayPalModal.address,
                amount: this.withdrawPayPalModal.amount
            };

            if (!data.address) {
                this.withdrawPayPalModal.error = 'E-mail is required';
                return;
            }

            if (!data.amount || isNaN(data.amount) || +data.amount < 0) {
                this.withdrawPayPalModal.error = 'Please enter valid amount';
                return;
            }

            this.withdrawPayPalModal.loading = true;
            this.withdrawPayPalModal.error = null;
            axios.post('/api/account/balance/withdraw/paypal', data).then(res => {
                this.withdrawPayPalModal.loading = false;
                this.withdrawPayPalModal.error = null;
                this.withdrawPayPalModal.success = true;
            }).catch(res => {
                this.withdrawPayPalModal.loading = false;

                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;
                    if (fields && fields.address) {
                        this.withdrawPayPalModal.error = fields.address.join('\n');
                        return;
                    }

                    if (fields && fields.amount) {
                        this.withdrawPayPalModal.error = fields.amount.join('\n');
                        return;
                    }
                }

                this.withdrawPayPalModal.error = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        }
    }
});


export default accountBalanceApp;
