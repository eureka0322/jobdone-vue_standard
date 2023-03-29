import Vue from 'vue';

import './modal.scss';


export default Vue.component('modal', {
    template: `
        <div class="modal-mask modal-component">
          <div class="modal-wrapper">
            <div class="modal-container">
              <div class="modal-body">
                <slot name="body">
                  default body
                </slot>
              </div>

              <div class="modal-footer">
                <slot name="footer">
                  default footer
                  <button class="modal-default-button" @click="$emit('close')">
                    OK
                  </button>
                </slot>
              </div>
            </div>
          </div>
        </div>
    `
});
