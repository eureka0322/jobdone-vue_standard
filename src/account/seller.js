import Vue from 'vue';
import axios from 'axios';
import fecha from 'fecha';

import storeInstance from '../frontend/store';


const ORDERS_ON_PAGE = 5;

const accountSellerApp = new Vue({
    data: {
        sharedState: storeInstance.state,

        ordersType: 'new',

        ordersLoading: false,
        orders: [],

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],
        minPreloaderDuration: 400,
        showSearch: false
    },
    mounted: function() {
        this.fetchOrders();
    },
    methods: {
        setOrderType(type) {
            if (this.ordersType === type) return;
            this.ordersType = type;
            this.orders = [];
            this.fetchOrders();
        },
        fetchOrders: function(page = 1) {
            let params = {
                limit: ORDERS_ON_PAGE,
                offset: (page - 1) * ORDERS_ON_PAGE,
                type: this.ordersType
            };

            this.ordersLoading = true;
            const processStartAt = new Date();
            axios.get(`/api/account/seller/orders`, { params: params }).then(resp => {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.ordersLoading = false;
                }, timeout);
                this.orders = resp.data.data.map(order => {
                    order.created_on = fecha.format(new Date(order.created_on), 'MMM D, YYYY');
                    order.delivery_on = order.delivery_on ? fecha.format(new Date(order.delivery_on), 'MMM D, YYYY') : '—';
                    return order;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / ORDERS_ON_PAGE),
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
            if (Math.ceil(this.totalResults / ORDERS_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchOrders(page);
        }
    }
});


export default accountSellerApp;
