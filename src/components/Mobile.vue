<template>
  <div class="tategaki" ref="box" :style="boxStyle">
    <div class="tategaki-container" ref="container" :style="containerStyle">
      <div
        :contenteditable="editMode"
        class="tategaki-editable"
        :class="editMode ? 'editing' : ''"
        data-key="editor"
        v-html="editContent"
        ref="editable"
        :style="editableStyle"
        :data-placeholder="placeholder"
        :data-placeholderactive="placeholderStatus"
        @keydown.esc="blur()"
        @keydown.enter.exact="checkBreakLine"
        @input="sync"
        @click="setEditMode"
        @blur="setViewMode"
      ></div>
      <close-button
        :close="setViewMode"
        :edit-mode="editMode"
      ></close-button>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import { indexedHTML, cleanHTML, extractText } from '../lib/format_html'
import { paste } from '../lib/copy_paste'
import CloseButton from './CloseButton.vue'

export default {
  name: 'Mobile',
  components: { CloseButton },
  props: {
    content: {
      type: String
    },
    styles: {
      type: Object
    },
    placeholder: {
      type: String
    },
    multiple: {
      type: Boolean,
      require: true
    }
  },
  data() {
    return {
      activeStyles: {},
      defaultStyles: {
        box: {
        },
        container: {
          fontSize: '16px'
        }
      },
      innerContent: '',
      previewContent: '',
      editMode: false
    }
  },
  computed: {
    editContent() {
      return indexedHTML(this.innerContent)
    },
    boxStyle() {
      return {
      }
    },
    containerStyle() {
      return {
        fontSize: this.activeStyles.container.fontSize
      }
    },
    editableStyle() {
      return {
        width: this.editMode ? `${window.innerWidth}px` : 'auto',
        height: this.editMode ? `${window.innerHeight}px` : 'auto'
      }
    },
    placeholderStatus() {
      return extractText(this.previewContent) === ''
    }
  },
  methods: {
    setEditMode() {
      if (!this.editMode) {
        document.body.append(this.$refs.container)
        this.editMode = true
        window.scrollTo(0, 0)
        setTimeout(() => {
          this.$refs.editable.focus()
        }, 10)
      }
    },
    setViewMode() {
      if (this.editMode) {
        this.$refs.box.append(this.$refs.container)
        this.editMode = false
      }
    },
    sync() {
      const nodes = this.$refs.editable.childNodes
      const html = cleanHTML(nodes)
      this.previewContent = html
      this.$emit('updated', html)
    },
    pasteText(e) {
      paste(e)
      this.sync()
    },
    blur() {
      document.activeElement.blur()
    },
    checkBreakLine(e) {
      if (!this.multiple) {
        e.preventDefault()
      }
    }
  },
  created() {
    this.activeStyles = merge(this.defaultStyles, this.styles)
  },
  mounted() {
    if (!this.content) {
      this.innerContent = '<p><br></p>'
      this.previewContent = '<p><br></p>'
    } else {
      this.innerContent = this.content
      this.previewContent = this.content
    }
    document.execCommand('DefaultParagraphSeparator', false, 'p')
  }
}
</script>

<style scoped>
.tategaki-container {
  word-break: break-all;
}
.tategaki-container >>> p {
  margin: 0;
  padding: 0;
}
.tategaki-editable {
  box-sizing: border-box;
  writing-mode: vertical-rl;
}
.tategaki-editable.editing {
  z-index: 9999;
  padding: 20px 10px 10px 10px;
  background: #fff;
  position: absolute;
  writing-mode: horizontal-tb;
  outline: none;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
[data-placeholder][data-placeholderactive='true']:before {
  content: attr(data-placeholder);
  opacity: 0.5;
}
.editing[data-placeholder][data-placeholderactive='true']:before {
  position: absolute;
}
.tategaki-editable {
}
</style>
