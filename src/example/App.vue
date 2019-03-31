<template>
  <div id="app">
    <h1>Tategaki Editor example</h1>
    <div contenteditable="true" style="height: 300px;font-size:32px;writing-mode: vertical-rl;">
      <p>aaaaaaaaaaaaaa</p>
    </div>
    <vue-tategaki
      content="<p>asdfadfadfadfa</p><p>lkjhlkjhlkjhljhl</p>"
      @updated="update"
      :styles="styles1"
      :placeholder="`place holder`"
    >
    </vue-tategaki>
    <vue-tategaki
      content="<p>second</p>"
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
  data () {
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
    update (e) {
      console.log('Class: , Function: , Line 36 e: 1', e)
    }
  }
})
</script>

<style scoped>
  #app {
    position: relative;
    z-index: 2;
    overflow: hidden;
    width: 300px;
    height: 600px;
    border: 1px solid #000;
  }
</style>
