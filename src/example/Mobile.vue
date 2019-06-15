<template>
  <div id="app">
    <h3>通常のフォントサイズ用</h3>
    <vue-tategaki
      class="container"
      key="1"
      content=""
      @updated="update"
      :styles="styles1"
      :placeholder="`place holder`"
    >
    </vue-tategaki>
    <h3>大きいフォントサイズ用</h3>
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
          height: '400px',
          fontSize: '42px'
        }
      }
    }
  },
  methods: {
    update(e) {
      console.log(e)
      // TODO: noco に組み込んだときに選択範囲が微妙にずれる原因を探る
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
@media screen and (max-width: 600px) {
  #app { padding: 10px; }
}

#app >>> p {
  padding: 0 5px;
  line-height: 225%;
}
.container {
  /*width: 300px;*/
}
h3 {
  text-align: right;
}
/*todo:フォーカス時にこれあてる？*/
body>*:not(.can-select) {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
