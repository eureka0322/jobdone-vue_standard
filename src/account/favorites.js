import Vue from 'vue';
import axios from 'axios';
import fecha from 'fecha';

import storeInstance from '../frontend/store';
import spinner from '../shared/components/spinner';


const ITEMS_ON_PAGE = 10;

const accountFavoritesApp = new Vue({
    components: {
        spinner
    },
    data: {
        sharedState: storeInstance.state,

        mode: 'favorites',

        itemsLoading: false,
        items: [],

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],
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

            if (mode === 'favorites') {
                this.fetchItems();
            } else {
                this.fetchSearches();
            }
        },
        fetchItems: function(page = 1) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE
            };

            this.itemsLoading = true;
            const processStartAt = new Date();
            axios.get('/api/account/favorites', { params: params }).then(function(resp) {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.itemsLoading = false;
                }, timeout);
                this.items = resp.data.data.map(item => {
                    return item;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            }.bind(this));
        },
        fetchSearches: function(page = 1) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE
            };

            this.itemsLoading = true;
            const processStartAt = new Date();
            axios.get('/api/account/favorites/searches', { params: params }).then(function(resp) {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.itemsLoading = false;
                }, timeout);
                this.items = resp.data.data.map(item => {
                    return item;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            }.bind(this));
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
            if (Math.ceil(this.totalResults / ITEMS_ON_PAGE) || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchItems(page);
        },
        handleFavoriteDeleteClick: function(service) {
            this.itemsLoading = true;
            axios.post(`/api/account/service/${service.id}/favorite/toggle`).then(resp => {
                this.itemsLoading = false;
                this.fetchItems(this.currentPage);
            });
        },
        handleFavoriteSearchDeleteClick: function(service) {
            this.itemsLoading = true;
            axios.post('/api/search/favorite/toggle?query=' + encodeURIComponent(service.q)).then(resp => {
                this.itemsLoading = false;
                this.fetchSearches(this.currentPage);
            });
        }
    }
});


export default accountFavoritesApp;
