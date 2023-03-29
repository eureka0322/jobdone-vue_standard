import Vue from 'vue';

import './countdown.scss';


export default Vue.component('countdown', {
    template: `
        <div class="Countdown__wrapper" :class="{'negative': !positive}">
            <div class="Countdown__section">
                <div class="Countdown__indicator Countdown__indicator-days" :data="days">
                    <div class="Countdown__digit">{{ days || 0 }}</div>
                    <div class="Countdown__indicator-left-half"></div>
                    <div class="Countdown__indicator-right-half"></div>
                    <div class="Countdown__indicator-point"></div>
                </div>
                <span class="Countdown__label">Days</span>
            </div>
            <div class="Countdown__digits-divider">:</div>
            <div class="Countdown__section">
                <div class="Countdown__indicator Countdown__indicator-hours" :data="hours">
                    <div class="Countdown__digit">{{ hours }}</div>
                    <div class="Countdown__indicator-left-half"></div>
                    <div class="Countdown__indicator-right-half"></div>
                    <div class="Countdown__indicator-point"></div>
                </div>
                <span class="Countdown__label">Hours</span>
            </div>
            <div class="Countdown__digits-divider">:</div>
            <div class="Countdown__section">
                <div class="Countdown__indicator Countdown__indicator-minutes" :data="minutes">
                    <div class="Countdown__digit">{{ minutes }}</div>
                    <div class="Countdown__indicator-left-half"></div>
                    <div class="Countdown__indicator-right-half"></div>
                    <div class="Countdown__indicator-point"></div>
                </div>
                <span class="Countdown__label">Minutes</span>
            </div>
            <div class="Countdown__digits-divider">:</div>
            <div class="Countdown__section">
                <div class="Countdown__indicator Countdown__indicator-seconds" :data="seconds">
                    <div class="Countdown__digit">{{ seconds }}</div>
                    <div class="Countdown__indicator-left-half"></div>
                    <div class="Countdown__indicator-right-half"></div>
                    <div class="Countdown__indicator-point"></div>
                </div>
                <span class="Countdown__label">Seconds</span>
            </div>
        </div>`,

    data: function() {
        return {
            now: Math.trunc((new Date()).getTime() / 1000)
        }
    },

    mounted: function() {
        this._interval = setInterval(() => {
            if (!this.positive) {
                window.clearInterval(this._interval);
                return;
            }

            this.now = Math.trunc((new Date()).getTime() / 1000);
        }, 1000);
    },

    props: {
        date: String
    },

    computed: {
        numberDate: function() {
            return Math.trunc(Date.parse(this.date) / 1000);
        },

        seconds: function() {
            const seconds = (this.numberDate - this.now) % 60;
            return seconds > 0 ? seconds : 0;
        },

        minutes: function() {
            const minutes = Math.trunc((this.numberDate - this.now) / 60) % 60;
            return minutes > 0 ? minutes : 0;
        },

        hours: function() {
            const hours = Math.trunc((this.numberDate - this.now) / 60 / 60) % 24;
            return hours > 0 ? hours : 0;
        },

        days: function() {
            const days = Math.trunc((this.numberDate - this.now) / 60 / 60 / 24);
            return days > 0 ? days : 0;
        },

        positive: function() {
            return (this.numberDate - this.now) > 0;
        }
    }
});