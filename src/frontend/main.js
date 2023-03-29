import Vue from 'vue';
import axios from 'axios';
import noUiSlider from 'nouislider';
import { parseQueryString } from '../shared/utils';
import spinner from '../shared/components/spinner';
import SortSelector from '../account/components/sort-selector';

import storeInstance from './store';


const PRODUCTS_ON_PAGE = 15;

const mainApp = new Vue({
    components: {
        spinner,
        SortSelector
    },
    data: {
        sharedState: storeInstance.state,

        topCategory: null,
        topCategoryId: null,
        isFiltersModified: false,

        isFilterOpened: false,

        query: '',
        lastQuery: '',
        lastQueryFavorite: false,
        selectedCategories: [],
        selectedTagsObject: {},
        selectedRating: 1,
        possibleSortingOptions: [],
        selectedSorting: 'recommended',
        selectedPrices: null,
        selectedIsOnline: false,

        isLoading: true,
        results: [],
        totalResults: 0,
        skipResults: 0,
        currentPage: 1,
        pages: [1],
        tags: [],
        imagesLinks: {
            ratingIcon: require('./assets/img/star-48x48.png'),
            hearthIcon: require('./assets/img/hearth-grey-32x32.png'),
            markNewIcon: require('./assets/img/icon-star13-white-42x42.png'),
            markFeaturedIcon: require('./assets/img/icon-star5-white-42x42.png'),
            tagIcon: require('./assets/img/tag-mark-32x32.png')
        },


        tagWindowOpened: false,
        tagWindowOffset: 0,

        searchId: Date.now(),
        minPreloaderDuration: 400
    },
    mounted: function() {
        let params = parseQueryString();
        this.query = params.query ? decodeURIComponent(params.query.replace(/\+/g, '%20')) : '';

        if (this.sharedState.extra.category_id) {
            this.selectedCategories.push(this.sharedState.extra.category_id);
        }

        if (this.sharedState.extra.top_category_id) {
            this.topCategoryId = this.sharedState.extra.top_category_id;

            for (let category of this.sharedState.categories) {
                if (category.id === this.topCategoryId) {
                    this.topCategory = category;
                    break;
                }
            }
        }

        this.initSliders();

        this.doSearch();
        this.setPossibleSortingOptions();
    },
    methods: {
        showResults(){
            console.log("RESULTS:")
            console.log(this.results)
        },
        addToFavorite(id) {
            // add to favorite
        },
        toggleFavorite(product) {
            console.warn(product)
            axios.post(`/api/account/service/${product.id}/favorite/toggle`, {}).then(resp => {
                product._is_favorite = !product._is_favorite;
            }).catch(err => {});
        },
        setPossibleSortingOptions() {
            this.possibleSortingOptions = [
                {
                    value: 'recommended',
                    label: 'Recommended',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: '-date',
                    label: 'Date Added',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: 'price',
                    label: 'Lower pric',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: '-price',
                    label: 'Higher price',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: '-orders',
                    label: 'Best Sellers',
                    icon: 'icon icon-sandwich'
                }
            ];
        },
        initSliders: function() {
            const formatter = {
                from: val => '$' + Math.round(val),
                to: val => '$' + Math.round(val)
            };

            let priceBounds = this.sharedState.extra.price_bounds && this.sharedState.extra.price_bounds.length ?
                this.sharedState.extra.price_bounds.map(price => price / 100) :
                [0, 1000];

            let priceSlider = noUiSlider.create(document.getElementById('sm-main-price-range'), {
                start: priceBounds,
                step: 1,
                connect: true,
                tooltips: [formatter, formatter],
                range: {
                    'min': priceBounds[0],
                    'max': priceBounds[1] > priceBounds[0] ? priceBounds[1] : 10000
                }
            });

            priceSlider.on('change', (values, handle, rawValues) => {
                this.isFiltersModified = true;
                this.selectedPrices = rawValues;
                this.doSearch();
            });

            let ratingSlider = noUiSlider.create(document.getElementById('sm-main-rating-range'), {
                start: this.selectedRating,
                step: 1,
                connect: [true, false],
                tooltips: false,
                range: {
                    'min': 1,
                    'max': 5
                }
            });

            ratingSlider.on('change', (values, handle, rawValues) => {
                if (this.selectedRating !== rawValues[0]) {
                    this.isFiltersModified = true;
                }

                this.selectedRating = rawValues[0];
            });

            this.$watch('selectedRating', newSelectedRating => {
                ratingSlider.set(newSelectedRating);
                this.doSearch();
            });

            this.$watch('selectedIsOnline', newSelectedIsOnline => {
                this.isFiltersModified = true;
                this.doSearch();
            });
        },
        doSearch: function(page = 1) {
            let params = {};
            if (this.query) {
                params.query = this.query;
            }
            
            if (this.topCategoryId) {
                if (this.selectedCategories.length) {
                    params.categories = this.selectedCategories.join(',');
                } else {
                    this.sharedState.categories.forEach(category => {
                        if (category.id === this.topCategoryId) {
                            params.categories = category.subcategories.map(subcategory => subcategory.id).join(',');
                            return;
                        }
                    });

                    if (!params.categories) {
                        // Top category is empty for some reason
                        params.categories = '-1';
                    }
                }
            }

            let selectedTags = Object.keys(this.selectedTagsObject);
            if (selectedTags.length) {
                params.tags = selectedTags.join(',');
            }

            params.offset = (page - 1) * PRODUCTS_ON_PAGE;
            params.limit = PRODUCTS_ON_PAGE;

            params.sort = this.selectedSorting;

            if (this.selectedPrices) {
                params.price_from = this.selectedPrices[0];
                params.price_to = this.selectedPrices[1];
            }

            if (this.selectedIsOnline) {
                params.online = true;
            }

            if (this.selectedRating > 1) {
                params.min_rating = this.selectedRating;
            }

            params.search_id = this.searchId;

            this.isLoading = true;
            const processStartAt = new Date();
            axios.get('/api/search', { params: params }).then(resp => {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.isLoading = false;
                }, timeout);
                if (params.query) {
                    this.lastQuery = params.query;
                    this.lastQueryFavorite = false;
                }

                this.results = (resp.data ? resp.data.data : []).map(result => {
                    if (result._primary_video_key) {
                        return Object.assign(result, { _playing: false })
                    } else {
                        return result;
                    }
                });
                this.totalResults = resp.data && resp.data.meta ? resp.data.meta.total : 0;
                this.tags = resp.data && resp.data.meta && resp.data.meta.tags ? resp.data.meta.tags : [];

                if (resp.data.meta.favorite) {
                    this.lastQueryFavorite = true;
                }

                this.doBuildPagination();

                window.history.pushState({}, window.document.title, '?' + createQueryString(params));
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / PRODUCTS_ON_PAGE),
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
            this.currentPage = page;

            this.doSearch(page);
            window.scrollTo(0, 0);
        },
        handleSelectTopCategory: function(category) {
            if (this.topCategoryId === category.id) {
                // this.topCategoryId = null;
                window.location.href = '/'; // TODO
            } else {
                this.topCategoryId = category.id;
                window.location.href = category._url;
            }

            this.selectedCategories = [];

            this.doSearch();
        },
        handleCategoriesChange: function() {
            this.doSearch();
        },
        handleQuerySubmit: function() {
            this.doSearch();
        },
        handleTagToggle: function(tag) {
            let modifiedSelectedTagsObject = Object.assign({}, this.selectedTagsObject);
            if (tag in modifiedSelectedTagsObject) {
                delete modifiedSelectedTagsObject[tag];
            } else {
                modifiedSelectedTagsObject[tag] = 1;
            }
            this.selectedTagsObject = modifiedSelectedTagsObject;

            this.isFiltersModified = true;

            this.doSearch();
        },
        handleRatingSelect: function(newSelectedRating) {
            if (this.selectedRating === newSelectedRating) {
                return;
            }

            this.isFiltersModified = true;
            this.selectedRating = newSelectedRating;
        },
        handleResetFilters: function() {
            if (!this.isFiltersModified) {
                return;
            }

            this.isFiltersModified = false;
            this.selectedRating = 1;
            this.selectedTagsObject = {};
            this.selectedPrices = null;
            this.selectedIsOnline = false;

            // if (this.sharedState.extra.category_id) {
            //     this.selectedCategories.push(this.sharedState.extra.category_id);
            // }

            // if (this.sharedState.extra.top_category_id) {
            //     this.topCategoryId = this.sharedState.extra.top_category_id;
            // }

            this.isFiltersModified = false;

            this.doSearch();
        },
        handleTagWindowOpen: function() {
            let elemRect = this.$refs.tagsFilter.getBoundingClientRect(),
                bodyRect = document.body.getBoundingClientRect();

            this.tagWindowOpened = true;

            // TODO: fix glitch
            setTimeout(() => {
                let filterWindowHeight = this.$refs.filterWindow.offsetHeight;
                this.tagWindowOffset = elemRect.top - bodyRect.top - this.$refs.tagsFilter.offsetHeight - filterWindowHeight / 2;
            }, 50);
        },
        handleSortingChange: function() {
            this.doSearch();
        },
        handleFavoriteSearchToggleClick: function() {
            if (!this.lastQuery) {
                return;
            }

            axios.post('/api/search/favorite/toggle?query=' + encodeURIComponent(this.lastQuery)).then(resp => {
                this.lastQueryFavorite = !this.lastQueryFavorite;
            }).catch(err => {});
        }
    }
});


function createQueryString(params) {
    // return Object.keys(params).map(key => `${key}=${window.encodeURIComponent(params[key])}`).join('&');
    let paramsArray = [];
    if (params.query) {
        paramsArray.push('query=' + encodeURIComponent(params.query));
    }

    return paramsArray.join('&');
}


export default mainApp;
