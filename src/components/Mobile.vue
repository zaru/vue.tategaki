<template>
  <div class="tategaki" ref="box" :style="boxStyle">
    <div class="tategaki-container" ref="container" :style="containerStyle">
      <div
        contenteditable="true"
        class="tategaki-editable"
        data-key="editor"
        v-html="editContent"
        ref="editable"
        :style="editableStyle"
        :data-placeholder="placeholder"
        :data-placeholderactive="placeholderStatus"
        @compositionstart="compositionstart"
        @compositionend="compositionend"
        @input="sync"
      ></div>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
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
          height: 'auto',
          position: 'static',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'auto',
          zIndex: '9999'
        },
        container: {
          minWidth: '100%',
          height: '100%',
          position: 'relative',
          top: '10px',
          left: '0',
          right: '0',
          bottom: '0',
          fontSize: '16px'
        }
      },
      originalContainerHeight: '',
      innerContent: '',
      previewContent: ''
    }
  },
  computed: {
    editContent() {
      return this.indexedHtml(this.innerContent)
    },
    contentHtml() {
      return this.indexedHtml(this.previewContent)
    },
    boxStyle() {
      return {
        height: this.activeStyles.box.height,
        position: this.activeStyles.box.position,
        top: this.activeStyles.box.top,
        left: this.activeStyles.box.left,
        right: this.activeStyles.box.right,
        bottom: this.activeStyles.box.bottom,
        background: this.activeStyles.box.background,
        zIndex: this.activeStyles.box.zIndex
      }
    },
    containerStyle() {
      return {
        fontSize: this.activeStyles.container.fontSize,
        minWidth: this.activeStyles.container.minWidth,
        height: this.activeStyles.container.height,
        position: this.activeStyles.container.position,
        top: this.activeStyles.container.top,
        left: this.activeStyles.container.left,
        right: this.activeStyles.container.right,
        bottom: this.activeStyles.container.bottom
      }
    },
    editableStyle() {
      return {
      }
    },
    placeholderStatus() {
      return this.contentHtml === '<p data-key="0">​</p>'
    }
  },
  methods: {
    indexedHtml(content) {
      const div = document.createElement('div')
      div.innerHTML = content
      div.childNodes.forEach((node, index) => {
        if (node.dataset) {
          node.dataset.key = index
        }
        node.childNodes.forEach((node, c_index) => {
          if (node.dataset) {
            node.dataset.key = `${index}-${c_index}`
          }
        })
      })
      return div.innerHTML
    },
    cleanHtml(nodes) {
      return [...nodes]
        .map(e => {
          e.removeAttribute('data-key')
          ;[...e.childNodes].map(e => {
            if (e.nodeType === 1) {
              e.removeAttribute('data-key')
            }
          })
          return e.outerHTML
        })
        .join('')
        .replace('&#8203;', '')
    },
    sync() {
      const nodes = this.$refs.editable.childNodes
      const cleanHTML = this.cleanHtml(nodes)
      this.previewContent = cleanHTML
      this.$emit('updated', cleanHTML)
    },
    pasteText(e) {
      paste(e)
      this.sync()
    }
  },
  created() {
    this.activeStyles = merge(this.defaultStyles, this.styles)
    this.originalContainerHeight = this.activeStyles.container.height
  },
  mounted() {
    if (!this.content) {
      this.innerContent = '<p>&#8203;</p>'
      this.previewContent = '<p>&#8203;</p>'
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
  position: relative;
  word-break: break-all;
  overflow-y: scroll;
  overflow-x: scroll;
}
.tategaki-container p {
  margin: 0;
  padding: 0;
}
.tategaki-editable {
  box-sizing: border-box;
  position: absolute;
  top: 0px;
  opacity: 1;
}
[data-placeholder][data-placeholderactive='true']:before {
  content: attr(data-placeholder);
  opacity: 0.5;
}
.tategaki-editable {
  user-select: text;
  -webkit-user-select: text;
  caret-color: transparent;
}
</style>
