import Vue from 'vue';
import axios from 'axios';
import { dropdown } from 'vue-strap';
import fecha from 'fecha';

import storeInstance from '../frontend/store';
import spinner from '../shared/components/spinner';


const SERVICES_ON_PAGE = 5;

const accountServicesApp = new Vue({
    components: {
        dropdown,
        spinner
    },
    data: {
        sharedState: storeInstance.state,

        servicesType: 'active',

        servicesLoading: false,
        services: [],

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],
        minPreloaderDuration: 400
    },
    mounted: function() {
        this.fetchServices();
    },
    methods: {
        setServicesType(type) {
            if (this.servicesType === type) return;
            this.processingTab = true;
            this.servicesType = type;

            this.services = [];
            this.fetchServices();
        },
        fetchServices: function(page = 1) {
            let params = {
                limit: SERVICES_ON_PAGE,
                offset: (page - 1) * SERVICES_ON_PAGE,
                type: this.servicesType
            };

            this.servicesLoading = true;
            const processStartAt = new Date();
            axios.get(`/api/account/seller/services`, { params: params }).then(function(resp) {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.servicesLoading = false;
                }, timeout);
                this.services = resp.data.data.map(service => {
                    service.published_on = service.published_on ? fecha.format(new Date(service.published_on), 'MMM D, YYYY') : '-';
                    return service;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            }.bind(this));
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / SERVICES_ON_PAGE),
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
            if (Math.ceil(this.totalResults / SERVICES_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchServices(page);
        },
        handleServicePauseClick: function(service) {
            this.servicesLoading = true;
            axios.post('/api/account/seller/services/' + service.id + '/pause').then(res => {
                this.servicesLoading = false;
                this.fetchServices(this.currentPage);
            }).catch(err => {
                this.servicesLoading = false;
            });
        },
        handleServiceResumeClick: function(service) {
            this.servicesLoading = true;
            axios.post('/api/account/seller/services/' + service.id + '/resume').then(res => {
                this.servicesLoading = false;
                this.fetchServices(this.currentPage);
            }).catch(err => {
                this.servicesLoading = false;
            });
        },
        handleServiceDeleteClick: function(service) {
            if (!confirm('Are you sure you want to delete service ' + service.title + '? This operation is unrecoverable!')) {
                return;
            }

            this.servicesLoading = true;
            axios.post('/api/account/seller/services/' + service.id + '/delete').then(res => {
                this.servicesLoading = false;
                this.fetchServices(this.currentPage);
            }).catch(err => {
                this.servicesLoading = false;
            });
        }
    }
});


export default accountServicesApp;
