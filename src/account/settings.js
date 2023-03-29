import Vue from 'vue';
import { modal } from 'vue-strap';
import VueFileUpload from 'vue-upload-component';
import axios from 'axios';

import storeInstance from '../frontend/store';


const accountSettingsApp = new Vue({
    components: {
        modal
    },
    data: {
        sharedState: storeInstance.state,

        isLoading: false,

        oldPassword: '',
        newPassword: '',
        newPassword2: '',
        passwordError: null,
        passwordSuccess: null,
        hideOldPassword: false,

        deleteAccountRequested: false,
        deleteAccountError: false,
        deleteAccountReason: '',
        deleteAccountNotes: '',
        deleteAccountLoading: false,
        deleteAccountModal: false,
        deleteAccountModalPassword: '',
        deleteAccountModalError: '',

        settingsError: null,
        settingsSuccess: null,
        tz: '',
    },
    mounted: function() {
        this.tz = this.sharedState.extra.tz;
        this.hideOldPassword = this.sharedState.extra.empty_password;
    },
    methods: {
        handleChangePasswordClick: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                old_password: this.oldPassword,
                password: this.newPassword,
                password2: this.newPassword2
            };

            this.isLoading = true;
            this.passwordError = this.passwordSuccess = null;
            axios.post('/api/account/settings/password', data).then(res => {
                this.isLoading = false;
                this.passwordSuccess = true;
                this.oldPassword = this.newPassword = this.newPassword2 = '';
                this.hideOldPassword = false;
            }).catch(res => {
                this.isLoading = false;
                if (res.response.data && res.response.data.error) {
                    let fields = res.response.data.error.fields;
                    if (fields && fields.old_password) {
                        this.passwordError = 'Please check your current password';
                        return;
                    }

                    if (fields && fields.password) {
                        this.passwordError = 'Passwords should match';
                        return;
                    }
                }

                this.passwordError = 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleChangeSettingsClick: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                tz: this.tz
            };

            this.isLoading = true;
            this.settingsError = this.settingsSuccess = null;
            axios.put('/api/account/settings', data).then(res => {
                this.isLoading = false;
                this.settingsSuccess = true;
            }).catch(res => {
                this.isLoading = false;
                this.settingsError = 'We are unable to fulfill your request at the moment, please try again later';
            });
        },
        handleDeleteAccountRequest: function() {
            this.deleteAccountLoading = true;
            this.deleteAccountRequested = true;

            axios.post('/api/account/settings/delete?verify=1').then(res => {
                this.deleteAccountLoading = false;
            }).catch(res => {
                this.deleteAccountLoading = false;
                this.deleteAccountError = (res.response.data.error && res.response.data.error.message) ? res.response.data.error.message : 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        },
        handleDeleteAccountClick: function() {
            this.deleteAccountModal = true;
            this.deleteAccountModalPassword = '';
        },
        handleDeleteAccount: function() {
            if (this.isLoading) {
                return;
            }

            let data = {
                reason: this.deleteAccountReason,
                notes: this.deleteAccountNotes,
                password: this.deleteAccountModalPassword
            };

            this.isLoading = true;
            axios.post('/api/account/settings/delete', data).then(res => {
                location.href = '/';
            }).catch(res => {
                this.isLoading = false;
                this.deleteAccountModalError = (res.response.data.error && res.response.data.error.message) ? res.response.data.error.message : 'We are unable to fulfill your request at the moment, please try again later'; // TODO
            });
        }
    }
});


export default accountSettingsApp;
