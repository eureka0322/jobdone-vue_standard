import Vue from 'vue';
import VueFileUpload from 'vue-upload-component';
import axios from 'axios';

import modal from '../shared/components/modal';
import storeInstance from './store';


const userApp = new Vue({
    components: {
        modal,
        FileUpload: VueFileUpload
    },
    data: {
        sharedState: storeInstance.state,

        recentProductsLoading: false,
        recentProducts: [],
        recentProductsCleared: false,

        additionalCarouselShowArrows: false,

        userProductsLoading: false,
        userProducts: [],
        showUserProductsLoadMore: false,

        isFeedbacksLoading: true,
        isMoreFeedbacksAvailable: false,
        feedbacks: [],

        mobileNavigationTabSelected: 0,

        newPhotoURL: null,
        photoUploading: false,
        photoUpload: {},
        photoUploadEvents: {},

        newCoverURL: null,
        coverUploading: false,
        coverUpload: {},
        coverUploadEvents: {},

        editDescription: false,
        description: '',
        descriptionOriginal: '',
        headline: '',
        headlineOriginal: '',
        descriptionError: null,
        descriptionSuccess: null,
        isDescriptionUpdating: false,

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
    mounted: function() {
        this.description = this.sharedState.extra.profile_description;
        this.descriptionOriginal = this.description;

        this.headline = this.sharedState.extra.profile_headline;
        this.headlineOriginal = this.headline;

        this.photoUploadEvents = {
            add: this.handlePhotoUploadAdd.bind(this),
            after: this.handlePhotoUploadAfter.bind(this)
        };

        this.coverUploadEvents = {
            add: this.handleCoverUploadAdd.bind(this),
            after: this.handleCoverUploadAfter.bind(this)
        };

        this.fetchFeedbacks();

        this.fetchUserProducts();
        
        this.fetchRecentProducts();

        this.$watch('showEnquiryModal', newShowEnquiryModal => {
            if (!newShowEnquiryModal) {
                return;
            }

            this.enquiryPeer = null;
            axios.get('/api/user/' + this.sharedState.extra.user.id).then(resp => {
                this.enquiryPeer = resp.data;
            });

            this.attachUploadEvents = {
                add: this.handleAttachUploadAdd.bind(this),
                after: this.handleAttachUploadAfter.bind(this)
            };
        });
    },
    methods: {
        handlePhotoUploadAdd: function(file, component) {
            this.photoUploading = true;
            component.active = true;
        },
        handlePhotoUploadAfter: function(file, component) {
            if (file.error || !file.response) {
                this.photoUploading = false;
                component.remove(file.id);
                return;
            }

            this.newPhotoURL = file.response._photo_url;
            this.photoUploading = false;
        },
        handleCoverUploadAdd: function(file, component) {
            this.coverUploading = true;
            component.active = true;
        },
        handleCoverUploadAfter: function(file, component) {
            if (file.error || !file.response) {
                this.coverUploading = false;
                component.remove(file.id);
                return;
            }

            this.newCoverURL = file.response._photo_url;
            this.coverUploading = false;
        },
        handleSaveDescriptionClick: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                profile_description: this.description,
                profile_headline: this.headline
            };

            this.isDescriptionUpdating = true;
            this.descriptionError = null;
            axios.put('/api/account/profile', data).then(res => {
                this.descriptionSuccess = true;
                this.isDescriptionUpdating = false;
                this.editDescription = false;
                this.descriptionOriginal = this.description;
                this.headlineOriginal = this.headline;
            }).catch(res => {
                this.isDescriptionUpdating = false;
                this.descriptionError = 'We are unable to fulfill your request at the moment, please try again later';
                // TODO
            });
        },
        handleCancelDescriptionClick: function() {
            this.isDescriptionUpdating = false;
            this.editDescription = false;
            this.description = this.descriptionOriginal;
            this.headline = this.headlineOriginal;
        },
        fetchUserProducts: function(start = 0) {
            let params = { limit: 6, offset: start };

            this.userProductsLoading = true;
            axios.get(`/api/search/user/${this.sharedState.extra.user.id}`, { params: params }).then(resp => {
                this.userProductsLoading = false;
                this.userProducts = this.userProducts.concat(resp.data.data ? resp.data.data : []);

                this.showUserProductsLoadMore = (resp.data.meta && resp.data.meta.total > this.userProducts.length);
            }).catch(function() {});
        },
        fetchMoreUserProducts: function() {
            this.fetchUserProducts(this.userProducts.length);
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

                Vue.nextTick(() => {
                    if (this.$refs.additionalCarousel.scrollWidth > this.$refs.additionalCarousel.parentElement.offsetWidth - 60) {
                        this.additionalCarouselShowArrows = true;
                    }
                });
            }).catch(function() {});
        },
        handleRecentProductsClear: function() {
            this.recentProductsCleared = true;
            localStorage.removeItem('rpids');
        },
        fetchFeedbacks: function() {
            if (!this.sharedState.extra.user) {
                return;
            }

            let params = {
                limit: 5,
                offset: this.feedbacks.length,
                sort: 'desc'
            };

            this.isFeedbacksLoading = true;
            axios.get(`/api/user/${this.sharedState.extra.user.id}/feedbacks`, { params: params }).then(resp => {
                this.isFeedbacksLoading = false;
                this.feedbacks = this.feedbacks.concat(resp.data);

                this.isMoreFeedbacksAvailable = (resp.data.length === params.limit);
            }).catch(function() {});
        },
        handleAdditionalCarouselLeftClick: function() {
            this.$refs.additionalCarousel.scrollLeft -= 283; // TODO
        },
        handleAdditionalCarouselRightClick: function() {
            this.$refs.additionalCarousel.scrollLeft += 283; // TODO
        },
        handleEnquirySendClick: function() {
            if (!this.enquiryText) {
                return;
            }

            let data = {
                text: this.enquiryText,
                seller_id: this.sharedState.extra.user.id
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
            });
        },
    }
});


export default userApp;
