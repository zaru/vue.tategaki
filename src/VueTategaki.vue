<template>
  <component
    :is="editorComponent"
    :content="content"
    :styles="styles"
    :placeholder="placeholder"
    :uid="uid()"
    @updated="update"
  ></component>
</template>

<script>
import PC from './components/PC.vue'
import Mobile from './components/Mobile.vue'
import browser from 'browser-detect'
const ua = browser()

export default {
  name: 'VueTategaki',
  components: { PC },
  props: {
    content: {
      type: String
    },
    styles: {
      type: Object
    },
    placeholder: {
      type: String
    }
  },
  data() {
    return {}
  },
  computed: {
    editorComponent() {
      return ua.mobile ? Mobile : PC
    }
  },
  methods: {
    update(method) {
      this.$emit('updated', method)
    },
    uid() {
      const strong = 1000
      return new Date().getTime().toString(16) + Math.floor(strong * Math.random()).toString(16)
    }
  },
  created() {},
  mounted() {}
}
</script>

<style scoped></style>
