import Vue from 'vue';
import axios from 'axios';
import VueFileUpload from 'vue-upload-component';
import storeInstance from '../../frontend/store';
import './style.scss';


if (document.getElementById('sm-account-verification-center')) {
    if (window.SM_BOOTSTRAP_DATA) {
        // Bootstrap data as it's a separate bundle
        storeInstance.bootstrap(window.SM_BOOTSTRAP_DATA);
    }

    new Vue({
        el: '#sm-account-verification-center',
        components: {
            FileUpload: VueFileUpload        
        },
        data: {
            someProperty: 'value',
            page : 0,

            country: "",
            countries:['England', 'Russia', "United State", "Poland", "Germany", "China"],

            first_name: "",
            last_name: "",
            birth_date: {
                year : "",
                month: "",
                day: ""
            },
            id_issue_country: "",
            id_type: "",
            id_number: "",
            id_expired_on: {
                year : "",
                month: "",
                day: ""
            },
            address1: "",
            address2: "",
            city: "",
            state: "",
            postal_code: "",
            institutions_name: "",
            document_type: "",
            document_issued: {
                year : "",
                month: "",
                day: ""
            }
        },
        methods: {
            verifyStart: function() {
                this.page = 1;
            },
            goToDashboard: function() {
                location.href="/dashboard";
            }
        }
    });
}
