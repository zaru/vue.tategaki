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
    <vue-tategaki
      class="container"
      key="2"
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
  data() {
    return {
      styles1: {
        container: {
          minWidth: '100%',
          height: '200px',
          fontSize: '16px'
        }
      },
      styles2: {
        container: {
          minWidth: '100%',
          height: '200px',
          fontSize: '18px'
        }
      }
    }
  },
  methods: {
    update(e) {
      console.log(e)
      // TODO: noco に組み込んだときに選択範囲が微妙にずれる原因を探る
      // TODO: 選択した後に、他の箇所をクリックしても選択範囲（見た目の）が解除されない
      // TODO: noco でテキスト入力時に、文字がちらつく（なんらかの更新処理がre-renderみたいになってる？）

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
  line-height: 225%;
}
  .container {
    /*width: 300px;*/
  }
</style>
