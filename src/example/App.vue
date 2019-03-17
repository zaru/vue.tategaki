<template>
  <div id="app">
    <h1>Tategaki Editor example</h1>
    <div contenteditable="true" style="height: 300px;font-size:32px;writing-mode: vertical-rl;">
      <p>aaaaaaaaaaaaaa</p>
    </div>
    <vue-tategaki
      content="<p>abcedfg</p>"
      @updated="update"
      :styles="styles1"
      :placeholder="`place holder`"
    >
    </vue-tategaki>
    <vue-tategaki
      content=""
      @updated="update"
      :styles="styles2"
      :placeholder="`place holder`"
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
          minWidth: '500px',
          height: '500px',
          multiline: true
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
