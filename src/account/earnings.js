import Vue from 'vue';
import fecha from 'fecha';
import axios from 'axios';

import storeInstance from '../frontend/store';


const TRANSACTIONS_ON_PAGE = 10;

const accountEarningsApp = new Vue({
    data: {
        sharedState: storeInstance.state,

        transactionsLoading: false,
        transactions: [],

        month: '-1',
        year: '-1',

        totalResults: 0,
        currentPage: 1,
        gotoPage: 1,
        pages: [1]
    },
    mounted: function() {
        this.fetchTransactions();

        this.$watch('year', newYear => {
            if (newYear === '-1') {
                this.month = '-1';
            }

            this.fetchTransactions();
        });

        this.$watch('month', _ => {
            this.fetchTransactions();
        });
    },
    methods: {
        fetchTransactions: function(page = 1) {
            let params = {
                limit: TRANSACTIONS_ON_PAGE,
                offset: (page - 1) * TRANSACTIONS_ON_PAGE
            };

            if (this.year !== '-1') {
                params.year = this.year;

                if (this.month !== '-1') {
                    params.month = this.month;
                }
            }

            this.transactionsLoading = true;
            axios.get(`/api/account/balance/earnings`, { params: params }).then(resp => {
                this.transactionsLoading = false;
                this.transactions = resp.data.data.map(transaction => {
                    transaction.created_on = transaction.created_on ? fecha.format(new Date(transaction.created_on), 'MMM D, YYYY h:mm A') : '-';

                    if (transaction.type === 'order_release') {
                        transaction._transaction = 'Income for the order #' + transaction.order_id;
                        transaction._order_url = storeInstance.urlFor('order', [transaction.order_id]);
                    } else if (transaction.type === 'order_prerelease') {
                        transaction._transaction = 'Funds pending clearance for the order #' + transaction.order_id;
                        transaction._order_url = storeInstance.urlFor('order', [transaction.order_id]);
                        transaction.release_on = transaction.release_on ? fecha.format(new Date(transaction.release_on), 'MMM D, YYYY') : '-';
                    }

                    return transaction;
                });

                this.totalResults = resp.data.meta.total;
                this.doBuildPagination();
            });
        },
        doBuildPagination: function() {
            let totalPages = Math.ceil(this.totalResults / TRANSACTIONS_ON_PAGE),
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
            if (Math.ceil(this.totalResults / TRANSACTIONS_ON_PAGE) < page || page < 1) {
                this.gotoPage = this.currentPage;
                return;
            }

            this.currentPage = page;
            this.gotoPage = page;
            this.fetchTransactions(page);
        },
        handleExportClick: function() {
            let params = {
                limit: this.totalResults
            };

            if (this.year !== '-1') {
                params.year = this.year;

                if (this.month !== '-1') {
                    params.month = this.month;
                }
            }

            this.transactionsLoading = true;
            axios.get(`/api/account/balance/earnings`, { params: params }).then(resp => {
                this.transactionsLoading = false;

                let csvContent = "data:text/csv;charset=utf-8,Date,Order,Amount\n";

                resp.data.data.forEach((transaction, idx) => {
                    let result = [];
                    result.push(transaction.created_on ? fecha.format(new Date(transaction.created_on), 'MMM D, YYYY h:mm A') : '-');

                    if (transaction.type === 'order_release') {
                        result.push('Income for the order #' + transaction.order_id);
                    } else if (transaction.type === 'order_prerelease') {
                        result.push('Funds pending clearance for the order #' + transaction.order_id);
                    }

                    result.push('$' + (transaction.amount / 100).toFixed(2));

                    let row = result.join(',');
                    csvContent += idx < resp.data.data.length ? row + '\n' : row;
                });
   
                // window.open(encodeURI(csvContent));
                var link = document.createElement("a");
                link.setAttribute("href", encodeURI(csvContent));
                link.setAttribute("download", "earnings.csv");
                document.body.appendChild(link); // Required for FF

                link.click(); 
            });
        }
    }
});


export default accountEarningsApp;
