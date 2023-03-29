import Vue from 'vue';
import fecha from 'fecha';
import axios from 'axios';
import VueFileUpload from 'vue-upload-component';

import storeInstance from '../frontend/store';
import messagingInstance from '../shared/messaging';
import { formatTimespanFromNow } from '../shared/utils';


const accountOrderRequirementsApp = new Vue({
    components: {
        FileUpload: VueFileUpload
    },
    data: {
        sharedState: storeInstance.state,

        buyerDisplayName: '',
        sellerDisplayName: '',
        buyerPhoto: '',
        sellerPhoto: '',

        order: null,
        orderCreatedDate: null,

        requirements: [],

        isLoading: false,
        error: null,

        showReplyForm: false
    },
    mounted: function() {
        this.order = this.sharedState.extra.order;
        this.orderCreatedDate = formatTimespanFromNow(this.order.created_on);

        this.requirements = (this.sharedState.extra.product_requirements || []).map((requirement, idx) => {
            let defaultReply = '',
                attachmentData = {};
            
            if (requirement.type === 'files') {
                defaultReply = [];
                attachmentData = {
                    _attachError: null,
                    _attachUploading: false,
                    _attachUploads: [],
                    _attachUploadEvents: {
                        add: this.handleAttachUploadAdd.bind(this, idx),
                        after: this.handleAttachUploadAfter.bind(this, idx)
                    },
                    _attachComponent: null
                };
            }

            return Object.assign({}, requirement, attachmentData, { reply: defaultReply });
        });

        this.buyerDisplayName = this.sharedState.extra.buyer.username;
        this.sellerDisplayName = this.sharedState.extra.seller.username;

        this.sellerPhoto = this.sharedState.extra.seller._photo_url;
        this.buyerPhoto = this.sharedState.extra.buyer._photo_url;
    },
    methods: {
        handleCancelOrderClick: function() {
            this.isLoading = true;
            axios.post('/api/account/buyer/orders/' + this.order.id + '/cancel').then(resp => {
                location.href = resp.data._url;
            }).catch(err => {
                this.isLoading = false;
                // TODO:
            });
        },
        handleStartOrderClick: function() {
            let data = {
                requirements: this.requirements.map(requirement => {
                    if (requirement.type === 'text') {
                        return {
                            id: requirement.id,
                            reply: requirement.reply
                        };
                    }

                    if (requirement.type === 'files') {
                        return {
                            id: requirement.id,
                            reply: requirement._attachUploads.map(file => Object.assign({ size: file.size }, file.response ))
                        };
                    }
                })
            };

            this.isLoading = true;
            this.error = null;
            axios.post('/api/account/buyer/orders/' + this.order.id + '/start', data).then(resp => {
                location.href = resp.data._url;
            }).catch(err => {
                this.isLoading = false;
                if (err.response && err.response.status === 400) {
                    this.error = 'Please check that you provided all necessary informartion requested by service provider';
                } else {
                    this.error = 'Something wrong has just happened. We already notified about this issue, and kindly ask you try this operation again a little later';
                }
            });
        },

        handleAttachUploadAdd: function(idx, file, component) {
            this.requirements[idx]._attachError = null;
            this.requirements[idx]._attachUploading = true;
            component.active = true;
        },
        handleAttachUploadAfter: function(idx, file, component) {
            this.requirements[idx]._attachUploading = false;

            if (file.error || !file.response || !file.response.attachmentId) {
                component.remove(file.id);

                if (file.response && file.response.error) {
                    this.requirements[idx]._attachError = file.response.error;
                }

                return;
            }

            this.requirements[idx]._attachComponent = component;
        },
        handleAttachDelete: function(idx, file) {
            if (this.requirements[idx]._attachUploading) {
                return;
            }

            let data = {
                attachmentId: file.response.attachmentId,
                filename: file.response.filename
            };


            console.log(this.requirements[idx]);

            this.requirements[idx]._attachUploading = true;
            axios.post('/api/account/buyer/attachments/delete', data).then(resp => {
                this.requirements[idx]._attachUploading = false;
                this.requirements[idx]._attachComponent && this.requirements[idx]._attachComponent.remove(file.id);
            }).catch(err => {
                this.requirements[idx]._attachUploading = false;
                console.log(err);
                // TODO
            });
        }
    }
});


export default accountOrderRequirementsApp;
