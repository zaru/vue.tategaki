<template>
  <div id="app">
    <h1>Tategaki Editor example</h1>
    <vue-tategaki
      content="<p>first content</p>"
      @updated="update"
      :styles="styles"
    >
    </vue-tategaki>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import VueTategaki from '../VueTategaki.vue'

export default Vue.extend({
  name: 'app',
  components: {
    VueTategaki
  },
  data () {
    return {
      styles: {
        container: {
          width: '500px',
          height: '500px',
          multiline: false
          // outline: false
        }
      }
    }
  },
  methods: {
    update (e) {
      console.log('Class: , Function: , Line 36 e: ', e)
    }
  }
})
</script>

<style scoped>
</style>
