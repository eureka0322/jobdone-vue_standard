import Vue from 'vue';

import './styles.scss';
import { directive as onClickOutside } from 'vue-on-click-outside';

export default Vue.component('SortSelector', {
    template: `
        <div class="SortSelector__wrapper">
            <div class="SortSelector__inner-container" 
                @click="toggle">
                <svg class="SortSelector__caret icon icon-ar-down">
                    <use xmlns:xlink="http://www.w3.org/1999/xlink" 
                        xlink:href="/static/images/sprite.svg#ar-down"></use>
                </svg>
                <div class="SortSelector__selected">
                    <span class="SortSelector__label" 
                        v-text="selectedOption.label"></span>
                    <i class="SortSelector__option-icon" 
                        :class="selectedOption.icon" 
                        v-if="selectedOption.icon"></i>
                </div>
            </div>
            
            <div class="SortSelector__dropdowm" 
                v-on-click-outside="close"
                v-if="isOpen">
                <div class="SortSelector__option" 
                    v-for="option in filtered" 
                    @click="select(option)">
                    <span class="SortSelector__label" 
                        v-text="option.label"></span>
                    <i class="SortSelector__option-icon" 
                        :class="option.icon" 
                        v-if="option.icon"></i>
                </div>
            </div>
        </div>
    `,

    directives: {
        onClickOutside
    },

    props: ['options', 'model', 'changed'],

    data() {
      return {
          selectedOption: {},
          isOpen: false,
          filtered: []
      }
    },

    watch: {
        options(v) {
            if (!this.selectedOption.value) {
                this.defineSelected();
            }
        }
    },

    methods: {
        defineSelected() {
            this.options.forEach(v => {
                if (v.value == this.model) {
                    this.selectedOption = v;
                }
            });
        },
        filterOptions() {
            this.filtered = [];
            this.options.forEach(v => {
               if (this.selectedOption.value !== v.value)  {
                   this.filtered.push(v);
               }
            });
        },
        select(v) {
            this.selectedOption = v;
            this.$emit('update:model', this.selectedOption.value);
            if (typeof this.changed === 'function') {
                this.changed(this.selectedOption.value);
            }
            this.filterOptions();
            this.close();
        },
        toggle() {
            this.filterOptions();
          this.isOpen = !this.isOpen;
        },
        close() {
            this.isOpen = false;
        }
    },
    mounted() {
        this.defineSelected();
        this.filterOptions();
    }
});