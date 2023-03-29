import Vue from 'vue';

import './spinner.scss';


export default Vue.component('spinner', {
    template: `
        <div class="Spinner__container">
            <div class="Spinner__petal"
                 v-for="petal in 18">
            </div>
        </div>
    `
});
