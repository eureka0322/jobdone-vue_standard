import Vue from 'vue';
import * as Clipboard from 'clipboard';
import axios from 'axios';
import VueFileUpload from 'vue-upload-component';
import lightbox from 'vue-lightbox';

import modal from '../shared/components/modal';
import { runSmoothScrolling, checkPatterns } from '../shared/utils';
import storeInstance from './store';

import SortSelector from '../account/components/sort-selector';


let thumbsScrollTimeout = null;


const productApp = new Vue({
    components: {
        modal,
        FileUpload: VueFileUpload,
        SortSelector,
        lightbox
    },
    data: {
        sharedState: storeInstance.state,

        statusVisible: false,

        carouselCurrentIndex: 0,
        carouselTotalItems: 0,

        isFavorite: false,

        isOrderDropdownOpened: false,

        isCarouselImageLoaded: false,        

        faqIndexesOpened: {},

        isFeedbacksLoading: true,
        isMoreFeedbacksAvailable: false,
        feedbacksSorting: 'desc',
        possibleFeedbackSortingOptions: [],
        feedbacks: [],

        feedbackReplies: {},

        recentProductsLoading: false,
        recentProducts: [],
        recentProductsCleared: false,

        extraProductsLoading: false,
        extraProductsType: null,
        extraProducts: [],

        additionalCarouselShowArrows: false,
        additionalCarousel2ShowArrows: false,

        showEnquiryModal: false,
        enquiryText: '',
        enquiryLoading: false,
        enquirySent: false,
        enquiryPeer: null,

        enquiryTextError: {
            pay: false,
            skype: false,
            phone: false,
            email: false
        },

        attachError: null,
        attachUploading: false,
        attachUploads: [],
        attachUploadEvents: {},
    },
    watch: {
        enquiryText: function(str) {
            this.enquiryTextError = checkPatterns(str);
        }
    },
    mounted: function() {
        this.carouselTotalItems = this.sharedState.extra.product_thumbnails_count;

        this.$watch('carouselCurrentIndex', () => {
            if (window.pageYOffset > this.$refs.carousel.offsetTop) {
                runSmoothScrolling(this.$refs.carousel.offsetTop, 200);
            }
        });

        this.$watch('showEnquiryModal', newShowEnquiryModal => {
            if (!newShowEnquiryModal) {
                return;
            }

            this.enquiryPeer = null;
            axios.get('/api/user/' + this.sharedState.extra.product_seller.id).then(resp => {
                this.enquiryPeer = resp.data;
            });

            this.attachUploadEvents = {
                add: this.handleAttachUploadAdd.bind(this),
                after: this.handleAttachUploadAfter.bind(this)
            };
        });

        this.isFavorite = this.sharedState.extra.product_is_favorite;

        this.fetchFeedbacks();

        this.fetchMoreProducts();

        this.fetchRecentProducts();
        this.sharedState.extra.product && this.addRecentProduct(this.sharedState.extra.product.id);

        new Clipboard.default('#copy-affiliate-link');

        this.setPossibleFeedbackSortingOptions();

    },
    methods: {
        setPossibleFeedbackSortingOptions() {
            this.possibleFeedbackSortingOptions = [
                {
                    value: 'desc',
                    label: 'Most recent',
                    icon: 'icon icon-sandwich'
                },
                {
                    value: 'asc',
                    label: 'Least recent',
                    icon: 'icon icon-sandwich'
                }
            ];
        },
        loadCarouselImage: function(imgIndex) {
            if (imgIndex == 0) {                
                this.isCarouselImageLoaded = true;
            }
        },
        carouselPreviousSlide: function() { 
            if (this.carouselCurrentIndex === 0) {
                this.carouselCurrentIndex = this.carouselTotalItems - 1;
            } else {
                this.carouselCurrentIndex = this.carouselCurrentIndex - 1;
            }
            this.pauseVideos();
        },
        carouselNextSlide: function() {
       
            if (this.carouselCurrentIndex === this.carouselTotalItems - 1) {
                this.carouselCurrentIndex = 0;
            } else {
                this.carouselCurrentIndex = this.carouselCurrentIndex + 1;
            }
            this.pauseVideos();
        },
        handleThumbSelect: function(index) {            
            this.carouselCurrentIndex = index;
            this.pauseVideos();
        },
        pauseVideos: function() {          
            let videos = this.$refs.carousel_items.getElementsByTagName('video');
            for(var i = 0; i < videos.length; i ++) {
                videos[i].pause();
            }
        },
        toggleFaqItem: function(index) {
            let modifiedFaqIndexesOpened = Object.assign({}, this.faqIndexesOpened);
            if (modifiedFaqIndexesOpened[index]) {
                delete modifiedFaqIndexesOpened[index];
            } else {
                modifiedFaqIndexesOpened[index] = 1;
            }
            this.faqIndexesOpened = modifiedFaqIndexesOpened;
        },
        loadRecentProductIDs: function() {
            let productIDs = [];

            try {
                productIDs = JSON.parse(localStorage.getItem('rpids'));
                if (!Array.isArray(productIDs)) {
                    productIDs = [];
                }
            } catch (e) {}

            return productIDs;
        },
        addRecentProduct: function(productID) {
            let productIDs = this.loadRecentProductIDs();

            if (productIDs.indexOf(productID) === -1) {
                productIDs.unshift(productID);
                productIDs = productIDs.slice(0, 6);
            }

            try {
                localStorage.setItem('rpids', JSON.stringify(productIDs));
            } catch (e) {}
        },
        fetchRecentProducts: function() {
            let productIDs = this.loadRecentProductIDs();

            this.recentProductsLoading = true;
            axios.get('/api/search/multiple', { params: { ids: productIDs.join(',') } }).then(resp => {
                this.recentProductsLoading = false;
                this.recentProducts = resp.data;
            }).catch(err => {});
        },
        handleRecentProductsClear: function() {
            this.recentProductsCleared = true;
            localStorage.removeItem('rpids');
        },
        fetchFeedbacks: function() {
            if (!this.sharedState.extra.product) {
                return;
            }

            let params = {
                limit: 5,
                offset: this.feedbacks.length,
                sort: this.feedbacksSorting
            };

            this.isFeedbacksLoading = true;
            axios.get(`/api/service/${this.sharedState.extra.product.id}/feedbacks`, { params: params }).then(resp => {
                this.isFeedbacksLoading = false;
                this.feedbacks = this.feedbacks.concat(resp.data);

                this.isMoreFeedbacksAvailable = (resp.data.length === params.limit);
            }).catch(err => {});
        },
        handleFeedbacksSortingChange: function() {
            this.feedbacks = [];
            this.fetchFeedbacks();
        },
        handleFeedbackReplyClick: function(id) {
            let modifiedReplies = Object.assign({}, this.feedbackReplies);
            modifiedReplies[id] = {
                text: '',
                saved: false,
                loading: false,
                error: null
            };
            this.feedbackReplies = modifiedReplies;
        },
        handleFeedbackPublish: function(id) {
            if (!this.feedbackReplies[id] || !this.feedbackReplies[id].text) {
                this.handleFeedbackDiscard(id);
                return;
            }

            if (this.feedbackReplies[id].loading) {
                return;
            }

            this.feedbackReplies[id].loading = true;
            this.feedbackReplies[id].error = null;
            axios.post(`/api/account/feedback/${id}/reply`, { reply: this.feedbackReplies[id].text }).then(resp => {
                this.feedbackReplies[id].loading = false;
                this.feedbackReplies[id].saved = true;
            }).catch(err => {
                this.feedbackReplies[id].loading = false;
                // this.feedbackReplies[id].error = 'Unable to post reply. Please try again later';
                this.feedbackReplies[id].saved = true;
            });
        },
        handleFeedbackDiscard: function(id) {
            let modifiedReplies = Object.assign({}, this.feedbackReplies);
            delete modifiedReplies[id];
            this.feedbackReplies = modifiedReplies;
        },
        fetchMoreProducts: function() {
            this.extraProductsLoading = true;
            axios.get(`/api/search/extra/${this.sharedState.extra.product.id}`).then(resp => {
                this.extraProductsLoading = false;
                this.extraProductsType = resp.data.meta ? resp.data.meta.type : null;
                this.extraProducts = resp.data.data ? resp.data.data : [];

                Vue.nextTick(() => {
                    if (this.$refs.additionalCarousel && this.$refs.additionalCarousel.scrollWidth > this.$refs.additionalCarousel.parentElement.offsetWidth - 60) {
                        this.additionalCarouselShowArrows = true;
                    }

                    if (this.$refs.additionalCarousel2.scrollWidth > this.$refs.additionalCarousel2.parentElement.offsetWidth - 60) {
                        this.additionalCarousel2ShowArrows = true;
                    }
                });
            }).catch(err => {});
        },
        toggleFavorite: function() {
            axios.post(`/api/account/service/${this.sharedState.extra.product.id}/favorite/toggle`, {}).then(resp => {
                this.isFavorite = !this.isFavorite;
            }).catch(err => {});
        },
        handleThumbsScroll: function(direction) {
            let shift = direction > 0 ? 5 : -5;

            clearTimeout(thumbsScrollTimeout);

            let fn = () => {
                this.$refs.thumbs.scrollLeft += shift;
                thumbsScrollTimeout = setTimeout(fn, 25);
            }

            fn();
        },
        handleThumbsScrollStop: function() {
            clearTimeout(thumbsScrollTimeout);
        },
        handleAdditionalCarouselLeftClick: function() {
            this.$refs.additionalCarousel.scrollLeft -= 283; // TODO
        },
        handleAdditionalCarouselRightClick: function() {
            this.$refs.additionalCarousel.scrollLeft += 283; // TODO
        },
        handleAdditionalCarousel2LeftClick: function() {
            this.$refs.additionalCarousel2.scrollLeft -= 220; // TODO
        },
        handleAdditionalCarousel2RightClick: function() {
            this.$refs.additionalCarousel2.scrollLeft += 220; // TODO
        },
        openLoginWindow: function() {
            storeInstance.bus.$emit('header.openLoginModal');
        },
        handleEnquirySendClick: function() {
            if (!this.enquiryText) {
                return;
            }

            let data = {
                text: this.enquiryText,
                service_id: this.sharedState.extra.product.id
            };

            if (this.attachUploads.length) {
                data.meta = {
                    attachments: []
                };
                this.attachUploads.forEach(v => {
                    data.meta.attachments.push(
                      Object.assign({ size: v.size }, v.response)
                    )
                });
            }

            this.enquiryLoading = true;
            axios.post('/api/enquiry', data).then(res => {
                this.enquiryLoading = false;
                this.enquirySent = true;

                location.href = res.data._url;
            }).catch(err => {
                this.enquiryLoading = false;
                // TODO
            });
        },
        handleAttachUploadAdd: function(file, component) {
            this.attachError = null;
            this.attachUploading = true;
            component.active = true;
        },
        handleAttachUploadAfter: function(file, component) {
            this.attachUploading = false;

            if (file.error || !file.response || !file.response.attachmentId) {
                component.remove(file.id);

                if (file.response && file.response.error) {
                    this.attachError = file.response.error;
                }

                return;
            }
        },
        showSocialLinksBox: function(evt) {
            // TODO: fix this mess below

            evt.stopPropagation();
            this.$refs.selfLinkForSocial.value = window.location.href;
 
            if (this.$refs.socialLinksbox.className === "arrow_box") {
                this.$refs.socialLinksbox.className= "arrow_box hidden";
            } else {
                this.$refs.socialLinksbox.className = "arrow_box";
            }
            
            this.$refs.socialLinksbox.addEventListener('click', evt => {
                evt.stopPropagation();
            });
            document.addEventListener('click', evt => {
                this.$refs.socialLinksbox.className= "arrow_box hidden";
            });
        },
        handleAttachDelete: function(file) {
            if (this.attachUploading) {
                return;
            }

            let data = {
                attachmentId: file.response.attachmentId,
                filename: file.response.filename
            };

            this.attachUploading = true;
            axios.post('/api/account/messaging/upload/delete', data).then(resp => {
                this.attachUploading = false;
                this.$refs.uploader.remove(file.id);
            }).catch(err => {
                this.attachUploading = false;
                // TODO
            });
        },
    }
});

export default productApp;
