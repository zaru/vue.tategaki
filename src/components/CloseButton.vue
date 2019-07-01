<template>
  <button
    class="close"
    @click="close"
    :style="closeStyle"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M12,2C6.477,2,2,6.477,2,12c0,5.523,4.477,10,10,10s10-4.477,10-10C22,6.477,17.523,2,12,2z M10,17.414l-4.707-4.707 l1.414-1.414L10,14.586l7.293-7.293l1.414,1.414L10,17.414z"/>
    </svg>
  </button>
</template>

<script>
export default {
  name: 'CloseButton',
  components: {},
  props: {
    editMode: {
      type: Boolean,
      require: true,
      default: false
    }
  },
  data() {
    return {
    }
  },
  computed: {
    closeStyle() {
      return {
        visibility: this.editMode ? 'visible' : 'visible'
      }
    }
  },
  methods: {
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.close {
  z-index: 10000;
  background: #fff;
  border-radius: 50%;
  position: fixed;
  border: none;
  text-align: center;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  line-height: 32px;
  padding: 0;
}
.close svg {
  width: 28px;
  height: 28px;
  fill: #444;
}
</style>
