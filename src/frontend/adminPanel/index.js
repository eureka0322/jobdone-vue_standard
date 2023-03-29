import Vue from 'vue';
import axios from 'axios';

import storeInstance from '../store';
import modal from '../../shared/components/modal';
import './style.scss';


if (document.getElementById('sm-frontend-admin')) {
    if (window.SM_BOOTSTRAP_DATA) {
        // Bootstrap data as it's a separate bundle
        storeInstance.bootstrap(window.SM_BOOTSTRAP_DATA);
    }

    new Vue({
        components: {
            modal
        },
        el: '#sm-frontend-admin',
        data: {
            module: null,
            loading: false,

            // service module:
            service: null,
            serviceShowEditModal: false,
            
            statusVisible: false
        },
        mounted: function() {
            if (storeInstance.state.module === 'service') {
                this.module = 'service';

                this.serviceLoad(storeInstance.state.extra.product.id);

                this.$watch('serviceShowEditModal', show => {
                    if (!show) {
                        return;
                    }

                    let editor = new window.SimpleMDE({
                        element: this.$refs.descriptionTextarea,
                        spellChecker: false,
                        initialValue: this.service.description,
                        status: false,
                        forceSync: true,
                        autosave: true,
                        toolbar: [
                            'bold',
                            'italic',
                            '|',
                            'heading-1',
                            'heading-2',
                            'heading-3',
                            '|',
                            'unordered-list',
                            'ordered-list',
                            'horizontal-rule',
                            '|',
                            'preview'
                        ],
                        previewRender: (text, previewEl) => {
                            axios.post('/api/admin/service/' + this.id + '/description/render', { text: text }).then(resp => {
                                previewEl.innerHTML = resp.data;
                            }).catch(e => {
                                previewEl.innerHTML = 'Error loading preview. Please try again';
                            });

                            return '';
                        }
                    });
                });
            }
        },
        methods: {
            serviceLoad: function(id) {
                this.loading = true;
                axios.get('/api/admin/service/' + id).then(resp => {
                    this.loading = false;
                    this.service = this.servicePrepare(resp.data);
                });
            },
            servicePrepare: function(service) {
                if (service.is_deleted) {
                    service._status = 'Deleted';
                } else {
                    if (service.published_on) {
                        if (!service.not_approved && !service.is_approved) {
                            service._status = 'Published & Awaiting Verification';
                        } else {
                            service._status = service.not_approved ? 'Rejected' : 'Approved';
                        }
                    } else {
                        service._status = 'Draft';
                    }
                }

                return service;
            },
            serviceHandleApprove: function() {
                this.loading = true;
                axios.post('/api/admin/service/' + this.service.id + '/approve').then(resp => {
                    this.loading = false;
                    this.service = this.servicePrepare(resp.data);
                });
            },
            serviceHandleReject: function() {
                this.loading = true;
                axios.post('/api/admin/service/' + this.service.id + '/reject').then(resp => {
                    this.loading = false;
                    this.service = this.servicePrepare(resp.data);
                });
            },
            serviceHandleSubmit: function() {
                let data = {
                    title: this.service.title,
                    description: this.$refs.descriptionTextarea.value
                };

                this.loading = true;
                axios.put('/api/admin/service/' + this.service.id, data).then(resp => {
                    location.reload();
                });
            }
        }
    });
}