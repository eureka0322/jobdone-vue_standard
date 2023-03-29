import Vue from 'vue';

import storeInstance from '../frontend/store';
import messagingInstance from '../shared/messaging';
import { formatTimespanFromNow, prepareNotification } from '../shared/utils';
import axios from 'axios';
import { directive as onClickOutside } from 'vue-on-click-outside';


const accountHeaderApp = new Vue({
    directives: {
        onClickOutside
    },
    data: {
        sharedState: storeInstance.state,
        
        isMenuOpened: false,
        expandedMenuItem: -1,

        accountMenuDropdown: null,

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
        searchIsOpen: true,
        suggestions: [],
        searchTimeout: null
    },
    mounted: function() {
        this.initMessaging();
    },
    methods: {
        selectTab(index) {
            this.notificationTab = index;
        },
        initMessaging: function() {
            let messagingReadyInterval = setInterval(() => {
                if (messagingInstance.isAuthenticated) {
                    clearInterval(messagingReadyInterval);
                    messagingInstance.loadRooms('enquiry', { limit: 5, folder: 'inbox' }).then(body => {
                        this.messagesLoading = false;

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


export default accountHeaderApp;
