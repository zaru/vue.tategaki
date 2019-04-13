<template>
  <div id="app">
    <h1>Tategaki Editor example</h1>
    <vue-tategaki
      key="1"
      content="<p>asdfadfadfadfa</p><p>lkjhlkjhlkjhljhl</p>"
      @updated="update"
      :styles="styles1"
      :placeholder="`place holder`"
    >
    </vue-tategaki>
    <vue-tategaki
      key="2"
      content="<p>123</p>"
      @updated="update"
      :styles="styles2"
      :placeholder="`これがプレースホルダーというやつです`"
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
  data() {
    return {
      styles1: {
        container: {
          minWidth: '120px',
          height: '500px',
          fontSize: '44px',
          multiline: true
          // outline: false
        }
      },
      styles2: {
        container: {
          minWidth: '200px',
          height: '300px',
          multiline: true
          // outline: false
        }
      }
    }
  },
  methods: {
    update(e) {
      console.log('Class: , Function: , Line 36 e: 1', e)
    }
  }
})
</script>

<style scoped>
#app {
}
</style>
