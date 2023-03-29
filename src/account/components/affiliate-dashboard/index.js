import Vue from 'vue';
import axios from 'axios';
import moment from 'moment';
import vSelect from 'vue-select';

import AnimatedInteger from '../../../shared/components/animated-integer'
import AffiliateDashboardChart from './affiliate-dashboard-chart'
import './styles.scss';


export default Vue.component('AffiliateDashboard', {
    template: `
        <div class="AffiliateDashboard__wrapper">
            <div class="AffiliateDashboard__header">
                <div class="AffiliateDashboard__title">
                    Quick Stats: {{ period.label }}
                </div>
        
                <v-select
                    class="AffiliateDashboard__period-select singleselect"
                    v-model="period"
                    :options="possiblePeriods">
                </v-select>
            </div>
            <div class="AffiliateDashboard__indicators">
                <div class="AffiliateDashboard__indicator" 
                    v-for="indicator in indicators">
                    <div class="AffiliateDashboard__indicator-label">{{ indicator.label }}</div>
                    <div class="AffiliateDashboard__indicator-value">
                        <animated-integer v-bind:prefix="indicator.prefix" v-bind:value="indicator.value"></animated-integer>
                    </div>
                    <div class="AffiliateDashboard__indicator-description AffiliateDashboard__indicator-description--primary">{{ indicator.primaryDescription }}</div>
                    <div class="AffiliateDashboard__indicator-description AffiliateDashboard__indicator-description--secondary">{{ indicator.secondaryDescription }}</div>
                </div>
            </div>
            <div class="AffiliateDashboard__chart">
                <affiliate-dashboard-chart v-if="chart.loaded" :height="270" :data="chart.data" :labels="chart.labels"></affiliate-dashboard-chart>
            </div>
        </div>
    `,

    components: {
        vSelect,
        AnimatedInteger,
        AffiliateDashboardChart
    },
    data() {
        return {
            possiblePeriods: [
                {
                    label: 'Last 7 Days',
                    value: {
                        from: moment().startOf('day').subtract(7, 'days').format(),
                        to: moment().endOf('day').format()
                    }
                },
                {
                    label: 'Last 30 Days',
                    value: {
                        from: moment().startOf('day').subtract(30, 'days').format(),
                        to: moment().endOf('day').format()
                    }
                }
            ],
            period: null,
            indicators: [
                {
                    key: 'impression',
                    label: 'impressions',
                    value: 0,
                    primaryDescription: 'No Data',
                    secondaryDescription: 'No Data'
                },
                {
                    key: 'register',
                    label: 'registration',
                    value: 0,
                    primaryDescription: 'No Data',
                    secondaryDescription: 'No Data'
                },
                {
                    key: 'become_seller',
                    label: 'become sellers',
                    value: 0,
                    primaryDescription: 'No Data',
                    secondaryDescription: 'No Data'
                },
                {
                    key: 'sale',
                    label: 'commissions',
                    value: 0,
                    primaryDescription: 'No Data',
                    secondaryDescription: 'No Data'
                },
                {
                    key: 'amount',
                    label: 'payout',
                    prefix: '$',
                    value: 0,
                    primaryDescription: 'No Data',
                    secondaryDescription: 'No Data'
                },
                // {
                //     label: 'total withdraw',
                //     value: 0,
                //     primaryDescription: 'No Data',
                //     secondaryDescription: 'No Data'
                // }
            ],
            chart: {
                data: [],
                labels: [],
                loaded: false
            },
            data: {}
        }
    },
    beforeMount: function() {
        this.period = this.possiblePeriods[0];
        this.handleChangePeriod(this.period);

        this.$watch('period', newPeriod => {
            this.handleChangePeriod(newPeriod || this.possiblePeriods[0]);
        });
    },
    methods: {
        handleChangePeriod(period) {
            this.loadData(period);
        },
        loadData(period) {
            let params = {
                from: this.period.value.from,
                to: this.period.value.to
            };

            axios.get('/api/account/affiliate_statistic', { params: params }).then(resp => {
                this.indicators.forEach(indicator => {
                    if (!resp.data.meta[indicator.key]) {
                        return;
                    }

                    indicator.value = resp.data.meta[indicator.key].value;
                });

                this.data = resp.data.data;
                this.buildChart();
            });
        },
        buildChart() {
            console.log('buildChart', this.period);
            this.chart.loaded = false;
            this.chart.data = [];
            this.chart.labels = [];

            const periods = moment(this.period.value.to).diff(moment(this.period.value.from), 'days') + 1;

            for (let i = 0; i < periods; i ++) {
                this.chart.labels.push(
                    moment(this.period.value.from).add(i, 'days').format('MMM D')
                );
            }

            //for each chart line
            this.chart.data.push({
                label: 'Impressions',
                data: this.data.impression ? this.data.impression : [],
                color: '#cccccc'
            });
            this.chart.data.push({
                label: 'Commisions',
                data: this.data.sale ? this.data.sale : [],
                color: '#0071BC'
            });
            this.chart.data.push({
                label: 'Registrations',
                data: this.data.register ? this.data.register : [],
                color: '#8CC63F'
            });

            setTimeout(() => {
                this.chart.loaded = true;
            });
        }
    }
});