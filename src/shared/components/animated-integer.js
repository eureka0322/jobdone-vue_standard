import Vue from 'vue';
import TWEEN from '@tweenjs/tween.js';

export default Vue.component('AnimatedInteger', {
  template: '<span>{{ prefix }}{{ tweeningValue }}</span>',
  props: {
    value: {
      type: Number,
      required: true
    },
    prefix: {
      type: String,
      required: false
    }
  },
  data() {
    return {
      tweeningValue: 0
    }
  },
  watch: {
    value(newValue, oldValue) {
      this.tween(oldValue, newValue)
    }
  },
  mounted () {
    this.tween(0, this.value)
  },
  methods: {
    tween(startValue, endValue) {
      const vm = this;
      function animate () {
        if (TWEEN.update()) {
          requestAnimationFrame(animate)
        }
      }
      new TWEEN.Tween({ tweeningValue: startValue })
        .to({ tweeningValue: endValue }, 500)
        .onUpdate(val => {
          vm.tweeningValue = val.tweeningValue.toFixed(0);
        })
        .onComplete(() => {
          vm.tweeningValue = this.value % 1 === 0 ? this.value.toFixed(0) : this.value.toFixed(2);
        })
        .start();
      animate()
    }
  }
})