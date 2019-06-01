import Vue from 'vue'
import App from './App.vue'
import Mobile from './Mobile.vue'

Vue.config.productionTip = false

new Vue({
  render: h => h(Mobile)
}).$mount('#app')
