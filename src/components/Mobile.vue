<template>
  <div class="tategaki" ref="box" :style="boxStyle">
    <div class="tategaki-container" ref="container" :style="containerStyle">
      <div
        contenteditable="true"
        class="tategaki-editable"
        :class="this.editMode ? 'editing' : ''"
        data-key="editor"
        v-html="editContent"
        ref="editable"
        :style="editableStyle"
        :data-placeholder="placeholder"
        :data-placeholderactive="placeholderStatus"
        @keydown.esc="blur()"
        @input="sync"
        @focus="setEditMode"
        @blur="setViewMode"
      ></div>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import { indexedHTML, cleanHTML, extractText } from '../lib/format_html'
import { paste } from '../lib/copy_paste'

export default {
  name: 'Mobile',
  components: {},
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
    return {
      activeStyles: {},
      defaultStyles: {
        box: {
        },
        container: {
          fontSize: '16px'
        }
      },
      originalContainerHeight: '',
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
    },
  },
  methods: {
    setEditMode() {
      this.editMode = true
    },
    setViewMode() {
      this.editMode = false
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
    }
  },
  created() {
    this.activeStyles = merge(this.defaultStyles, this.styles)
    this.originalContainerHeight = this.activeStyles.container.height
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
  padding: 10px;
  background: #fff;
  position: absolute;
  writing-mode: horizontal-tb;
  top: 0px;
  right: 0px;
  bottom: 0px;
  left: 0px;
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
