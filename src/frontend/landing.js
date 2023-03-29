import Vue from 'vue';
import axios from 'axios';
import { directive as onClickOutside } from 'vue-on-click-outside';

import { parseQueryString } from '../shared/utils';


const landingApp = new Vue({
    directives: {
        onClickOutside
    },
    data: {
        query: null,
        searchIsOpen: false,
        suggestions: [],
        searchTimeout: null
    },
    mounted: function() {
        this.setQuery();
    },
    methods: {
        setQuery() {
            let params = parseQueryString();
            this.query = params.query ? decodeURIComponent(params.query.replace(/\+/g, '%20')) : '';
        },

        clearSearch() {
            this.searchIsOpen = false;
            this.setQuery();
            this.suggestions = [];
        },

        goTo(query) {
            window.location.href = `${window.location.origin}?query=${query}`;
            this.clearSearch();
        },

        onSearch() {
            if (this.searchTimeout) clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.suggestions = [];
                axios.get('/api/search/suggest', {
                    params: {
                        query: this.query
                    }
                }).then(res => {
                    this.suggestions = res.data;
                    if (this.suggestions.length) {
                        this.searchIsOpen = true;
                    }
                });
            }, 750);
        },
        clearRecentSearches() {
            this.clearSearch();
        }
    }
});


export default landingApp;
