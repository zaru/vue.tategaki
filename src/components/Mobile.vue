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
        @input="sync"
        @focus="setEditMode"
        @blur="setViewMode"
      ></div>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import { indexedHTML, cleanHTML } from '../lib/format_html'
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
    contentHtml() {
      return indexedHTML(this.previewContent)
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
        writingMode: this.editMode ? 'horizontal-tb' : 'vertical-rl',
        top: this.editMode ? '0px' : 'auto',
        right: this.editMode ? '0px' : 'auto',
        bottom: this.editMode ? '0px' : 'auto',
        left: this.editMode ? '0px' : 'auto',
        width: this.editMode ? `${window.innerWidth}px` : 'auto',
        height: this.editMode ? `${window.innerHeight}px` : 'auto'
      }
    },
    placeholderStatus() {
      return this.contentHtml === '<p data-key="0"></p>'
    }
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
    }
  },
  created() {
    this.activeStyles = merge(this.defaultStyles, this.styles)
    this.originalContainerHeight = this.activeStyles.container.height
  },
  mounted() {
    if (!this.content) {
      this.innerContent = '<p></p>'
      this.previewContent = '<p></p>'
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
  position: absolute;
  top: 0px;
  opacity: 1;
}
[data-placeholder][data-placeholderactive='true']:before {
  content: attr(data-placeholder);
  opacity: 0.5;
}
.tategaki-editable {
}
</style>
