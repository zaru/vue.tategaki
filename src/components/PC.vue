<template>
  <div class="tategaki" ref="box" :style="boxStyle">
    <div class="tategaki-container" ref="container" :style="containerStyle">
      <div
        contenteditable="true"
        class="tategaki-editable"
        data-key="editor"
        :data-uid="uid"
        v-html="editContent"
        ref="editable"
        :style="editableStyle"
        @compositionstart="compositionstart"
        @compositionend="compositionend"
        @input="sync"
        @keydown.38.exact.prevent.stop="arrowKeyMove"
        @keydown.40.exact.prevent.stop="arrowKeyMove"
        @keydown.39.exact.prevent.stop="arrowKeyMove"
        @keydown.37.exact.prevent.stop="arrowKeyMove"
        @keydown.enter.exact="moveCaretAndNormalize"
        @keydown.meta.65="selectionAll = true"
        @keydown.delete.exact="moveCaretAndNormalize"
        @keydown.meta.88="moveCaretAndNormalize"
        @paste.prevent="pasteText"
      ></div>

      <div
        class="tategaki-preview"
        data-key="editor"
        :data-uid="uid"
        :data-placeholder="placeholder"
        :data-placeholderactive="placeholderStatus"
        v-html="contentHtml"
        ref="preview"
        @click="selected"
      ></div>

      <caret
        ref="caret"
        v-if="$refs.preview && $refs.editable && $refs.container"
        :font-size="activeStyles.container.fontSize"
        :parent="$refs.preview"
        :editor="$refs.editable"
        :viewer="$refs.container"
        :uid="uid"
      ></caret>

      <selection
        v-if="$refs.preview"
        :preview="$refs.preview"
        :content="contentHtml"
        :do-selection-all="getSelectionAll"
        :uid="uid"
      ></selection>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import browser from 'browser-detect'
import Caret from './Caret.vue'
import Selection from './Selection.vue'
import { paste } from '../lib/copy_paste'
import { horizontalMove, verticalMove } from '../lib/arrow_key_move'
import { syncCaret } from '../lib/sync_caret'
import { indexedHTML, cleanHTML, normalizeHTML, extractText } from '../lib/format_html'
const ua = browser()

export default {
  name: 'PC',
  components: { Caret, Selection },
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
    uid: {
      type: String,
      require: true
    }
  },
  data() {
    return {
      editing: false,
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
          outline: false,
          // このスタイルはもはや必要ないかもしれない
          // boxShadow: '0 0 5px 0px rgba(0, 123, 255, .4)',
          boxShadow: '',
          fontSize: '16px'
        }
      },
      originalContainerHeight: '',
      originalParentNode: null,
      originalNextNode: null,
      iOSKeyboardHeight: '450px',
      innerContent: '',
      previewContent: '',
      compositing: false,
      memoRange: {
        startContainer: null,
        endContainer: null,
        startOffset: 0,
        endOffset: 0
      },
      selectionAll: false
    }
  },
  computed: {
    editContent() {
      return indexedHTML(this.innerContent)
    },
    contentHtml() {
      return indexedHTML(this.previewContent)
    },
    offsetRight() {
      const ratio = ua.os.includes('Windows') ? 2.5 : 1.5
      return parseInt(this.activeStyles.container.fontSize) * ratio
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
        right: `-${this.offsetRight}px`
      }
    },
    placeholderStatus() {
      return extractText(this.previewContent) === ''
    },
    getSelectionAll() {
      return this.selectionAll
    }
  },
  methods: {
    currentSelectionAndRange() {
      const sel = window.getSelection()
      return { sel: sel, range: sel.getRangeAt(0) }
    },
    sync() {
      const nodes = this.$refs.editable.childNodes
      const html = cleanHTML(nodes)
      this.previewContent = html
      this.$emit('updated', html)
    },
    moveCaretAndNormalize() {
      this.$refs.caret.moveCaret()
      normalizeHTML(this.$refs.editable.childNodes)
    },
    arrowKeyMove(e) {
      if (e.keyCode === 38 || e.keyCode === 40) {
        horizontalMove(e)
      } else if (e.keyCode === 37 || e.keyCode === 39) {
        const { event, range } = verticalMove(e, this.$refs.caret.$el, this.activeStyles.container.fontSize)
        this.focusAndMoveCaret(event, range)
      }
    },
    focusAndMoveCaret(e, range) {
      // テキスト以外のエディタ部分をクリックした場合は、フォーカスを末尾へ
      if (e.target.className === 'tategaki-preview') {
        const p = this.$refs.editable.childNodes[
          this.$refs.editable.childNodes.length - 1
        ]
        if (p.childNodes.length) {
          const t = p.childNodes[p.childNodes.length - 1]
          this.activeFocus(t, t.length)
        } else {
          this.activeFocus(p, 0)
        }
      } else {
        const activeRange = this.getActiveRange(range, e.target)

        // TODO: 削除する / ここでもとに戻すと TextNode が flat になるのでだめ
        // this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
        this.focusEditor(activeRange)
      }
    },
    getActiveRange(range, target) {
      // MEMO: 自身の textnode が親から見て何番目のインデックスなのかを知る
      let targetNode = range.startContainer
      let i = 0
      if (range.startContainer.nodeType === 3) {
        while (
          (targetNode = targetNode.previousSibling) !== null &&
          targetNode.textContent !== ''
        ) {
          i++
        }
      }
      return {
        key: target.dataset.key,
        index: i,
        startOffset: range.startOffset
      }
    },
    activeFocus(node, offset) {
      const editorRange = document.createRange()
      const editorSel = window.getSelection()
      editorRange.setStart(node, offset)
      editorRange.collapse(true)
      editorSel.removeAllRanges()
      editorSel.addRange(editorRange)
      this.$refs.editable.style.background = '#000'
      this.$refs.editable.focus()
    },
    focusEditor(activeRange) {
      // 指定された node と offset から editor node を探索して focus させる
      const key = parseInt(activeRange.key)
      let targetNode = [...this.$refs.editable.childNodes].find((node, index) => {
        return index === key
      })
      // MEMO: ネストされた node がある場合の対応
      if (!targetNode) {
        targetNode = [...this.$refs.editable.childNodes]
          .map(node => [...node.childNodes])
          .flat()
          .find((node, index) => {
            return index === key
          })
      }
      if (!targetNode) {
        targetNode = this.$refs.editable.childNodes[0]
      }
      this.activeFocus(
        targetNode.childNodes[activeRange.index],
        activeRange.startOffset
      )
    },
    selectedRange(e) {
      if (ua.name === 'firefox') {
        const range = document.createRange()
        range.setStart(e.rangeParent, e.rangeOffset)
        return range
      }
      return this.currentSelectionAndRange().range
    },
    selected(e) {
      const range = this.selectedRange(e)
      // 範囲選択ではない場合はフォーカスさせる
      if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
        this.focusAndMoveCaret(e, range, false)
      } else {
        // Range オブジェクトを利用して caret を同期させるために preview を
        // editable に全く同じ node を入れるようにする
        this.$refs.editable.childNodes.forEach((node, index) => {
          node.replaceWith(this.$refs.preview.childNodes[index].cloneNode(true))
        })

        syncCaret(this.$refs.editable)
      }
    },
    pasteText(e) {
      paste(e)
      this.sync()
    },
    compositionstart() {
      this.compositing = true
    },
    compositionend() {
      this.compositing = false
      this.sync()
    },
    resetSelectionFlag() {
      this.selectionAll = false
    }
  },
  created() {
    this.activeStyles = merge(this.defaultStyles, this.styles)
    this.originalContainerHeight = this.activeStyles.container.height
  },
  mounted() {
    if (!this.content) {
      this.previewContent = '<p><br></p>'
      this.innerContent = '<p><br></p>'
    } else {
      this.previewContent = this.content
      this.innerContent = this.content
    }
    document.execCommand('DefaultParagraphSeparator', false, 'p')
    document.addEventListener('selectionchange', this.resetSelectionFlag)
  },
  destroyed() {
    document.removeEventListener('selectionchange', this.resetSelectionFlag)
  }
}
</script>

<style scoped>
.tategaki-container {
  position: relative;
  word-break: break-all;
  writing-mode: vertical-rl;
  /* TODO: ここを指定すると組み込んだときにレイアウトが崩れる… */
  /*overflow-y: hidden;*/
  /*overflow-x: scroll;*/
}
.tategaki-container >>> p {
  margin: 0;
  padding: 0;
  min-width: 1rem;
}
.tategaki-container >>> p::selection {
  background: transparent;
}
.tategaki-editable {
  box-sizing: border-box;
  position: absolute;
  z-index: -1;
  top: 0px;
  opacity: 0;
  color: #f00;
  background-color: #ddd;
  width: 100%;
  height: 100%;
}
.tategaki-preview {
  box-sizing: border-box;
  opacity: 1;
  z-index: 2;
  /* MEMO: ここを absolute にしていたけど、それだと組み込むときにつぶれるので relative へ、もし何らかの不具合があったらここがあやしい*/
  position: relative;
  top: 0px;
  right: 0px;
  width: 100%;
  height: 100%;
}
[data-placeholder][data-placeholderactive='true']:before {
  content: attr(data-placeholder);
  opacity: 0.5;
  position: absolute;
  /* TODO: ここで p の line-height を取得して設定しないと微妙に位置がずれる */
}
.tategaki-editable,
.tategaki-preview {
  user-select: text;
  -webkit-user-select: text;
  /* なぜか透明にすると Chrome で文字列削除時に span が勝手に挿入される… */
  /*caret-color: transparent;*/
}
</style>
