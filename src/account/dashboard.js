import Vue from 'vue';
import axios from 'axios';
import fecha from 'fecha';

import storeInstance from '../frontend/store';
import messagingInstance from '../shared/messaging';
import { formatTimespanFromNow, prepareNotification, parseQueryString } from '../shared/utils';
import spinner from '../shared/components/spinner';


const ITEMS_ON_PAGE = 10;

const accountDashboardApp = new Vue({
    components: {
        spinner
    },
    data: {
        sharedState: storeInstance.state,

        mode: 'todos',

        notificationsLoading: false,
        notifications: [],
        notificationsUnread: 0,

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1],

        todos: [],
        processingTab: true,
        minPreloaderDuration: 400
    },
    mounted: function() {
        setTimeout(() => {
            this.processingTab = false;
        }, this.minPreloaderDuration);
        this.todos = this.sharedState.extra.todos.map(todo => {
            if (todo.order_id) {
                todo._url = storeInstance.urlFor('order', [todo.order_id]);
            }

            return todo;
        });

        let markAsRead = false,
            qs = parseQueryString();

        if (!this.todos.length || qs.tab === 'notification') {
            this.mode = 'notifications';
            markAsRead = true;
        }

        let messagingReadyInterval = setInterval(() => {
            if (messagingInstance.isAuthenticated) {
                clearInterval(messagingReadyInterval);
                this.fetchNotifications(1, markAsRead);

                this.$watch('mode', newMode => {
                    this.currentRoom = null;
                    this.items = [];

                    if (newMode === 'notifications') {
                        this.fetchNotifications(1, true);
                    } else {
                        setTimeout(() => {
                            this.processingTab = false;
                        }, this.minPreloaderDuration);
                    }
                });
            }
        }, 100);
    },
    methods: {
        setMode() {
            this.processingTab = true;
        },
        fetchNotifications: function(page = 1, markAsRead = false) {
            let params = {
                limit: ITEMS_ON_PAGE,
                offset: (page - 1) * ITEMS_ON_PAGE,
                markAsRead: markAsRead
            };

            this.notificationsLoading = true;
            const processStartAt = new Date();
            messagingInstance.loadHistory('notification:' + this.sharedState.user.id, params, (err, data, meta) => {
                const processDuration = new Date() - processStartAt;
                const timeout = processDuration < this.minPreloaderDuration ? this.minPreloaderDuration - processDuration : 0;
                setTimeout(() => {
                    this.processingTab = false;
                }, timeout);
                this.notificationsLoading = false;

                if (err) {
                    // TODO
                    return;
                }

                this.notifications = data.map(prepareNotification, this);
                this.notificationsUnread = markAsRead ? 0 : meta.unread;

                this.totalResults = meta.total;

                this.doBuildPagination();
            });
        },

        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / ITEMS_ON_PAGE),
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
            if (Math.ceil(this.totalResults / ITEMS_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;

            this.fetchNotifications(page);
        },
    }
});


export default accountDashboardApp;
