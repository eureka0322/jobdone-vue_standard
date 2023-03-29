import Vue from 'vue';
import { modal, datepicker, dropdown } from 'vue-strap';
import vSelect from 'vue-select';
import axios from 'axios';
import fecha from 'fecha';

import storeInstance from '../frontend/store';
import spinner from '../shared/components/spinner';


const ITEMS_ON_PAGE = 10;

const accountDiscountsApp = new Vue({
    components: {
        modal,
        datepicker,
        dropdown,
        vSelect,
        spinner
    },
    data: {
        sharedState: storeInstance.state,

        mode: 'codes',

        itemsLoading: false,
        items: [],

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],

        discountModal: {
            show: false,
            value: '',
            product: null,
            error: null,
            loading: false,
            response: null
        },

        offerModal: {
            show: false,
            value: '',
            product: null,
            start_date: '',
            end_date: '',
            error: null,
            loading: false,
            id: null
        },

        selectProducts: [],

        minPreloaderDuration: 400
    },
    mounted: function() {
        this.fetchItems();
    },
    methods: {
        setMode(mode) {
            if (this.mode === mode) return;
            this.mode = mode;

            this.items = [];
            this.fetchItems();
        },
        fetchItems: function(page = 1) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE
            };

            if (this.mode === 'codes') {
                this.fetchCodes(params);
            } else {
                this.fetchOffers(params);
            }
        },
        fetchCodes: function(params) {
            this.itemsLoading = true;
            const processStartAt = new Date();
            axios.get(`/api/account/seller/discounts`, { params: params }).then(resp => {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.itemsLoading = false;
                }, timeout);
                this.items = resp.data.data.map(item => {
                    // service.published_on = service.published_on ? fecha.format(new Date(service.published_on), 'MMM D, YYYY') : '-';
                    return item;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        fetchOffers: function(params) {
            this.itemsLoading = true;
            const processStartAt = new Date();
            axios.get(`/api/account/seller/offers`, { params: params }).then(resp => {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.itemsLoading = false;
                }, timeout);
                this.items = resp.data.data.map(item => {
                    item._start_date_display = item.start_date ? fecha.format(new Date(item.start_date), 'MMM D, YYYY') : '-';
                    item._end_date_display = item.end_date ? fecha.format(new Date(item.end_date), 'MMM D, YYYY') : '-';
                    return item;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / ITEMS_ON_PAGE),
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
            if (Math.ceil(this.totalResults / ITEMS_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchItems(page);
        },

        handleAddDiscountClick: function() {
            this.discountModal = {
                show: true,
                value: '',
                product: null,
                error: null,
                loading: false,
                response: null
            };
        },
        handleAddDiscount: function() {
            let data = {
                product_id: this.discountModal.product ? this.discountModal.product.id : null,
                value: this.discountModal.value,
                type: 'absolute'
            };

            if (!data.product_id) {
                this.discountModal.error = 'Please select a product';
                return;
            }

            if (!data.value || isNaN(data.value) || +data.value < 0) {
                this.discountModal.error = 'Please enter valid value of discount';
                return;
            }

            this.discountModal.loading = true;
            this.discountModal.error = null;
            axios.post('/api/account/seller/discounts', data).then(res => {
                this.discountModal.loading = false;
                this.discountModal.error = null;
                this.discountModal.response = res.data;

                if (this.mode !== 'codes') {
                    this.mode = 'codes';
                } else {
                    this.fetchItems();
                }
            }).catch(res => {
                this.discountModal.loading = false;

                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;

                    if (fields && fields.value) {
                        this.discountModal.error = fields.value.join('\n');
                        return;
                    }
                }

                this.discountModal.error = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleDeleteDiscountClick: function(discount) {
            if (!confirm('Are you sure you want to delete this discount code?')) {
                return;
            }

            this.itemsLoading = true;
            axios.delete('/api/account/seller/discounts/' + discount.id).then(res => {
                this.itemsLoading = false;
                this.fetchCodes();
            }).catch(res => {
                this.itemsLoading = false;
                // TODO
            });
        },
        handleCreateOfferClick: function() {
            this.offerModal = {
                show: true,
                value: '',
                product: null,
                start_date: '',
                end_date: '',
                error: null,
                loading: false,
                id: null
            };
        },
        handleCreateOffer: function() {
            let data = {
                value: this.offerModal.value,
                type: 'absolute',
                start_date: this.offerModal.start_date,
                end_date: this.offerModal.end_date
            };

            if (!this.offerModal.id) {
                data.product_id = this.offerModal.product ? this.offerModal.product.id : null;
            }

            if (!data.product_id && !this.offerModal.id) {
                this.offerModal.error = 'Please select a product';
                return;
            }

            if (!data.value || isNaN(data.value) || +data.value < 0) {
                this.offerModal.error = 'Please enter valid value of discount';
                return;
            }

            if (!data.start_date || !data.end_date) {
                this.offerModal.error = 'Please select both start and end dates';
                return;
            }

            this.offerModal.loading = true;
            this.offerModal.error = null;

            let promise = this.offerModal.id ?
                axios.put('/api/account/seller/offers/' + this.offerModal.id, data) :
                axios.post('/api/account/seller/offers', data);

            promise.then(res => {
                this.offerModal.loading = false;
                this.offerModal.error = null;
                this.offerModal.response = res.data;

                this.offerModal.show = false;

                if (this.mode !== 'offers') {
                    this.mode = 'offers';
                } else {
                    this.fetchItems();
                }
            }).catch(res => {
                this.offerModal.loading = false;

                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;

                    if (fields && fields.value) {
                        this.offerModal.error = fields.value.join('\n');
                        return;
                    }
                }

                this.offerModal.error = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleDeleteOfferClick: function(offer) {
            if (!confirm('Are you sure you want to delete this offer?')) {
                return;
            }

            this.itemsLoading = true;
            axios.delete('/api/account/seller/offers/' + offer.id).then(res => {
                this.itemsLoading = false;
                this.fetchOffers();
            }).catch(res => {
                this.itemsLoading = false;
                // TODO
            });
        },
        handleEditOfferClick: function(offer) {
            this.offerModal = {
                show: true,
                value: (offer.value / 100).toFixed(2),
                product: offer._product_title,
                start_date: fecha.format(new Date(offer.start_date), 'dd-MM-YYYY'),
                end_date: fecha.format(new Date(offer.end_date), 'dd-MM-YYYY'),
                error: null,
                loading: false,
                id: offer.id
            };
        },
        fetchSelectProducts: function(search, loading) {
            loading(true);
            axios.get('/api/account/seller/search/services?query=' + encodeURIComponent(search)).then(resp => {
                this.selectProducts = resp.data;
                loading(false);
            }).catch(err => {
                // TODO
                loading(false);
            });
        }
    }
});


export default accountDiscountsApp;
