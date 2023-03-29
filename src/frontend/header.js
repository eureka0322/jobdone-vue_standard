import Vue from 'vue';
import axios from 'axios';
import { directive as onClickOutside } from 'vue-on-click-outside';
import storeInstance from './store';
import messagingInstance from '../shared/messaging';
import { formatTimespanFromNow, prepareNotification, parseQueryString } from '../shared/utils';

const headerApp = new Vue({
    directives: {
        onClickOutside
    },
    data: {
        sharedState: storeInstance.state,

        isMenuOpened: false,
        expandedMenuItem: -1,

        loginModalOpened: false,
        loginModalRecoveryMode: false,
        signupModalOpened: false,
        recoveryModalOpened: false,

        loginModalUsername: '',
        loginModalPassword: '',
        loginModalLoading: false,
        loginModalError: null,
        loginModalSuccess: null,
        loginModalFieldErrors: {},
        loginModalNext: null,

        signupModalDetectedCountry: null,
        signupModalCountries: [],
        signupModalLoadingCountries: false,

        signupModalUsername: '',
        signupModalPassword: '',
        signupModalPassword2: '',
        signupModalEmail: '',
        signupModalCountry: -1,
        signupModalLoading: false,
        signupModalError: null,
        signupModalFieldErrors: {},
        signupModalSuccess: false,

        recoveryModalPassword: '',
        recoveryModalPassword2: '',
        recoveryModalLoading: false,
        recoveryModalError: null,

        messagesLoading: true,
        messages: [],
        messagesUnread: 0,

        notificationsImages: {
            configMessages: require("./assets/images/icons/config-icon-84x84.png"),
        },

        notificationsLoading: true,
        notifications: [],
        notificationsUnread: 0,
        notificationTab: 0,

        query: null,
        searchIsOpen: false,
        suggestions: [],
        searchTimeout: null
    },
    mounted: function() {
        this.setQuery();
        this.$watch('signupModalOpened', newSignupModalOpened => {
            if (newSignupModalOpened && !this.signupModalLoadingCountries && !this.signupModalCountries.length) {
                // Preload countries data
                this.signupModalLoadingCountries = true;

                axios.get('/api/auth/country').then(res => {
                    this.signupModalCountries = res.data.countries;
                    if (res.data.country) {
                        this.signupModalCountry = res.data.country;
                    }

                    this.signupModalLoadingCountries = false;
                }).catch(res => {
                    this.signupModalLoadingCountries = false;
                });
            }
        });

        storeInstance.bus.$on('header.openLoginModal', () => {
            this.loginModalOpened = true;
        });

        storeInstance.bus.$on('header.openSignupModal', () => {
            this.signupModalOpened = true;
        });

        if (this.sharedState.extra.mode === 'recovery') {
            this.recoveryModalOpened = true;
        }

        if (this.sharedState.extra.mode === 'login') {
            if (this.sharedState.extra.code === '200') {
                this.loginModalSuccess = 'Congrats! You can now login using your new credentials';
            } else if (this.sharedState.extra.code === '400') {
                this.loginModalError = 'Verification link is incorrect. Please check that you copied full link from email message';
            } else if (this.sharedState.extra.code === '401') {
                this.loginModalError = 'Authentication failed. Please try again later and contact support if the problem persists';
            }

            this.loginModalOpened = true;
        }

        if (this.sharedState.extra.next) {
            this.loginModalNext = this.sharedState.extra.next;
        }

        if (this.sharedState.extra.mode === 'signup') {
            this.signupModalOpened = true;
        }

        this.initMessaging();
    },
    methods: {
        selectTab(index) {
            this.notificationTab = index;
        },
        chooseCategory: function(id) {
            window.location.href = '/?categories=' + id;
        },

        handleSocialLogin: function(provider) {
            let args = [provider];
            if (this.loginModalNext) {
                args.push(this.loginModalNext);
            }

            location.href = storeInstance.urlFor('oauth_authorize', args);
        },

        loginModalHandleLoginClick: function() {
            let data = {
                username: this.loginModalUsername,
                password: this.loginModalPassword,
                remember: false, // TODO: not used at the time
                csrf_token: this.sharedState.extra.csrf_token
            };

            this.loginModalLoading = true;
            this.loginModalError = null;
            this.loginModalFieldErrors = {};

            axios.post('/api/auth/login', data).then(res => {
                window.location.href = this.loginModalNext || '/';
            }).catch(res => {
                this.loginModalLoading = false;
                if (res.response.data.error) {
                    if (res.response.data.error.message) {
                        this.loginModalError = res.response.data.error.message;
                    }

                    if (res.response.data.error.fields) {
                        for (let field in res.response.data.error.fields) {
                            this.loginModalFieldErrors[field] = res.response.data.error.fields[field].join(',');
                        }
                    }
                } else {
                    this.loginModalError = 'We are unable to fulfill your request at the moment. Please try again later';
                }
            });
        },

        loginModalHandleRecoveryClick: function() {
            let data = {
                username: this.loginModalUsername,
                csrf_token: this.sharedState.extra.csrf_token
            };

            this.loginModalLoading = true;
            this.loginModalError = null;
            this.loginModalFieldErrors = {};

            axios.post('/api/auth/recovery', data).then(res => {
                this.loginModalSuccess = 'We sent you email with a magic link. Follow this link to recover your password';
            }).catch(res => {
                this.loginModalLoading = false;
                if (res.response.data.error) {
                    if (res.response.data.error.message) {
                        this.loginModalError = res.response.data.error.message;
                    }

                    if (res.response.data.error.fields) {
                        for (let field in res.response.data.error.fields) {
                            this.loginModalFieldErrors[field] = res.response.data.error.fields[field].join(',');
                        }
                    }
                } else {
                    this.loginModalError = 'We are unable to fulfill your request at the moment. Please try again later';
                }
            });
        },

        signupModalHandleSignupClick: function() {
            let data = {
                username: this.signupModalUsername,
                email: this.signupModalEmail,
                password: this.signupModalPassword,
                password2: this.signupModalPassword2,
                country: this.signupModalCountry !== -1 ? this.signupModalCountry : null,
                csrf_token: this.sharedState.extra.csrf_token
            };

            this.signupModalLoading = true;
            this.signupModalError = null;
            this.signupModalFieldErrors = {};

            axios.post('/api/auth/signup', data).then(res => {
                this.signupModalSuccess = true;
            }).catch(res => {
                this.signupModalLoading = false;
                if (res.response.data.error) {
                    if (res.response.data.error.message) {
                        this.signupModalError = res.response.data.error.message;
                    }

                    if (res.response.data.error.fields) {
                        for (let field in res.response.data.error.fields) {
                            this.signupModalFieldErrors[field] = res.response.data.error.fields[field].join(',');
                        }
                    }
                } else {
                    this.signupModalError = 'We are unable to fulfill your request at the moment. Please try again later';
                }
            });
        },

        recoveryModalHandleChangeClick: function() {
            let data = {
                password: this.recoveryModalPassword,
                password2: this.recoveryModalPassword2,
                token: this.sharedState.extra.token,
                csrf_token: this.sharedState.extra.csrf_token
            };

            this.recoveryModalLoading = true;
            this.recoveryModalError = null;
            this.recoveryModalFieldErrors = {};

            axios.post('/api/auth/recovery/complete', data).then(res => {
                this.recoveryModalLoading = false;
                this.recoveryModalOpened = false;
                this.loginModalSuccess = 'You can now login with your new password';
                this.loginModalOpened = true;
            }).catch(res => {
                this.recoveryModalLoading = false;
                if (res.response.data.error) {
                    if (res.response.data.error.message) {
                        this.recoveryModalError = res.response.data.error.message;
                    }

                    if (res.response.data.error.fields) {
                        this.recoveryModalError = 'Passwords should match and contain at least 8 characters';
                    }
                } else {
                    this.recoveryModalError = 'We are unable to fulfill your request at the moment. Please try again later';
                }
            });
        },

        initMessaging: function() {
            if (!storeInstance.state.user) {
                // Do not wait for messaging if user is guest
                return;
            }

            let messagingReadyInterval = setInterval(() => {
                if (messagingInstance.isAuthenticated) {
                    clearInterval(messagingReadyInterval);
                    messagingInstance.loadRooms('enquiry', { limit: 5, folder: 'inbox' }).then(body => {
                        this.messagesLoading = false;

                        // this.items = body.data.map(this.prepareRoom, this);
                        this.messages = body.data.map(room => {
                            if (room.meta.service) {
                                room._display_name = `Enquiry on service — ${room.meta.service.title}`;
                            } else {
                                room._display_name = 'Message to seller';
                            }

                            room._url = storeInstance.urlFor('inbox', [room.type, room.entity_id]);

                            return room;
                        });

                        this.messagesUnread = body.meta.unread;

                        messagingInstance.subscribeToRead(this.handleRoomRead.bind(this), true);
                    }, err => {
                        // TODO
                        return;
                    });

                    messagingInstance.loadHistory('notification:' + this.sharedState.user.id, { limit: 5 }, (err, data, meta) => {
                        this.notificationsLoading = false;

                        if (err) {
                            // TODO
                            return;
                        }

                        this.notifications = data.map(prepareNotification, this);
                        this.notificationsUnread = meta.unread;

                        messagingInstance.subscribeToNotifications(msg => {
                            let idxToRemove = -1;

                            if (msg.type === 'new_message') {
                                for (let idx = 0; idx < this.notifications.length; idx++) {
                                    let item = this.notifications[idx];
                                    if (item.type === msg.type && item.meta.type === msg.meta.type && item.meta.entityId === msg.meta.entityId) {
                                        idxToRemove = idx;
                                        break;
                                    }
                                };
                            }

                            if (idxToRemove === -1 && this.notifications.length === 5) {
                                idxToRemove = 4;
                            }

                            if (idxToRemove !== -1) {
                                this.notifications.splice(idxToRemove, 1);
                            }

                            this.notifications.unshift(prepareNotification.call(this, msg));
                            this.notificationsUnread += 1;
                        });
                    });
                }
            }, 100);
        },

        handleRoomRead: function(body) {
            let [ type, entityId ] = body.room.split(':');

            for (let message of this.messages) {
                if (message.type === type && message.entity_id === entityId) {
                    message.unread = false;
                    break;
                }
            }

            if (type === 'enquiry') {
                this.messagesUnread = Math.max(0, this.messagesUnread - 1);
            }

            if (type === 'notification') {
                this.notificationsUnread = 0;
            }
        },

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


export default headerApp;
