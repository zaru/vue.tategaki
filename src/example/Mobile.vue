<template>
  <div id="app">
    <vue-tategaki
      class="container"
      key="1"
      content=""
      @updated="update"
      :styles="styles1"
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
  data() {
    return {
      styles1: {
        container: {
          minWidth: '100%',
          height: '200px',
          fontSize: '16px'
        }
      }
    }
  },
  methods: {
    update(e) {
      console.log(e)
    }
  },
  mounted() {}
})
</script>

<style scoped>
#app {
  width: 100%;
  padding: 100px;
  box-sizing: border-box;
}
#app >>> p {
  padding: 0 5px;
}
</style>
