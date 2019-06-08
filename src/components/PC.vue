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
        @keydown.meta.90.prevent.stop="undo"
        @keydown.enter.exact="disableBreakLine"
        @keydown.meta.65="selectionAll = true"
        @keydown.delete.exact="moveCaretAndNormalize"
        @paste.prevent="pasteText"
        @focus="focus"
        @blur="focusOut"
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
        :visible="showCaret"
        :uid="uid"
      ></caret>

      <selection
        v-if="$refs.preview"
        :parent="$refs.preview"
        :content="contentHtml"
        :do-selection-all="getSelectionAll"
      ></selection>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import browser from 'browser-detect'
import Caret from './Caret.vue'
import Selection from './Selection.vue'
import StackBuffer from '../lib/stack_buffer'
import { paste } from '../lib/copy_paste'
import { horizontalMove, verticalMove } from '../lib/arrow_key_move'
import { syncCaret } from '../lib/sync_caret'
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
      type: String
    }
  },
  data() {
    return {
      stackBuffer: new StackBuffer(),
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
          fontSize: '16px',
          multiline: true
        },
        caret: {
          display: 'none',
          top: '0px',
          left: '0px'
        }
      },
      originalContainerHeight: '',
      originalParentNode: null,
      originalNextNode: null,
      iOSKeyboardHeight: '450px',
      innerContent: '',
      previewContent: '',
      stackContent: '', // MEMO: 変更 diff を取るためのもの（日本語変換中の変更を反映させない）
      stackRange: {},
      compositing: false,
      memoRange: {
        startContainer: null,
        endContainer: null,
        startOffset: 0,
        endOffset: 0
      },
      showCaret: false,
      selectionAll: false
    }
  },
  computed: {
    editContent() {
      return this.indexedHtml(this.innerContent)
    },
    contentHtml() {
      return this.indexedHtml(this.previewContent)
    },
    offsetRight() {
      const ratio = ua.os.includes('Windows') ? 2.5 : 1.5
      return parseInt(this.activeStyles.container.fontSize) * ratio
    },
    caretStyle() {
      return {
        display: this.activeStyles.caret.display,
        width: `${parseInt(this.activeStyles.container.fontSize) * 1.4}px`,
        height: '1px',
        top: this.activeStyles.caret.top,
        left: this.activeStyles.caret.left
      }
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
      return this.contentHtml === '<p data-key="0"></p>'
    },
    getSelectionAll() {
      return this.selectionAll
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
    normalize(nodes) {
      // TODO: もし <p></p> の中に入れ子の HTML 構造ができた場合は、判定して再起させる必要がある
      nodes.forEach(e => {
        e.normalize()
      })
    },
    currentSelectionAndRange() {
      const sel = window.getSelection()
      return { sel: sel, range: sel.getRangeAt(0) }
    },
    sync() {
      const nodes = this.$refs.editable.childNodes
      const cleanHTML = this.cleanHtml(nodes)
      this.previewContent = cleanHTML
      if (!this.compositing) {
        const memoRange = {}
        memoRange.startContainer = this.stackRange.startContainer
        memoRange.endContainer = this.stackRange.endContainer
        memoRange.startOffset = this.stackRange.startOffset
        memoRange.endOffset = this.stackRange.endOffset
        this.stackBuffer.stack(this.stackContent, memoRange)
        this.stackContent = cleanHTML
        this.stackRange = this.selectedRange()
      }
      this.$emit('updated', cleanHTML)
    },
    moveCaretAndNormalize() {
      this.$refs.caret.moveCaret()
      this.normalize(this.$refs.editable.childNodes)
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
    focus() {
      this.defaultStyles.container.outline = true
    },
    focusOut() {
      this.defaultStyles.container.outline = false
      this.activeStyles.caret.display = 'none'
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
      // TODO: ここで文字列選択時に offset が 0 になるのがバグの原因
      // テキスト選択時、text node がなぜか分割されておかしくなっているっぽい
      const range = this.selectedRange(e)
      // 範囲選択ではない場合はフォーカスさせる
      if (range.startOffset === range.endOffset) {
        this.showCaret = true
        this.focusAndMoveCaret(e, range, false)
      } else {

        // TODO: ここで選択したときに preview の TextNode は分割されている
        // Range オブジェクト自体も分割されたものを利用しているっぽい
        // preview to editable に Node を clone できれば一番いいけど
        // いまはテストで手動で入れている
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
    disableSwipeBack(e) {
      // TODO: firefox / safari だとうまくうごいていない
      // エディタ以外のスクロールには関与しない
      if (!e.path.find(dom => dom.className === 'content-editable-page')) {
        return
      }
      const container = this.$refs.container.getBoundingClientRect()
      const preview = this.$refs.preview.getBoundingClientRect()
      if (container.x - 2 < preview.x && e.deltaX < 0) {
        e.preventDefault()
      }
    },
    disableBreakLine(e) {
      if (!this.activeStyles.container.multiline) {
        e.preventDefault()
        return
      }
    },
    undo() {
      const buffer = this.stackBuffer.current
      if (buffer) {
        this.$refs.editable.innerHTML = buffer.content
        this.$refs.preview.innerHTML = buffer.content
        // MEMO: ctrl-z して文字入力したときにスタックを復元させる
        this.stackContent = buffer.content
        this.stackRange = buffer.range
        // MEMO: Range オブジェクト自体は参照なので具体的な値をメモ化して復元させる
        const newRange = document.createRange()
        newRange.setStart(buffer.range.startContainer, buffer.range.startOffset)
        newRange.setEnd(buffer.range.endContainer, buffer.range.endOffset)
        this.focusAndMoveCaret({ target: this.$refs.editable }, newRange)
      }
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
      this.previewContent = '<p></p>'
      this.innerContent = '<p></p>'
      this.stackContent = '<p></p>'
    } else {
      this.previewContent = this.content
      this.innerContent = this.content
      this.stackContent = this.content
    }
    document.execCommand('DefaultParagraphSeparator', false, 'p')
    window.addEventListener('mousewheel', this.disableSwipeBack)
    document.addEventListener('selectionchange', this.resetSelectionFlag)
  },
  destroyed() {
    window.removeEventListener('mousewheel', this.disableSwipeBack)
    document.removeEventListener('selectionchange', this.resetSelectionFlag)
  }
}
</script>

<style scoped>
.tategaki-container {
  position: relative;
  word-break: break-all;
  writing-mode: vertical-rl;
  overflow-y: hidden;
  overflow-x: scroll;
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
  position: absolute;
  top: 0px;
  right: 0px;
  width: 100%;
  height: 100%;
}
[data-placeholder][data-placeholderactive='true']:before {
  content: attr(data-placeholder);
  opacity: 0.5;
}
.tategaki-editable,
.tategaki-preview {
  user-select: text;
  -webkit-user-select: text;
  /* なぜか透明にすると Chrome で文字列削除時に span が勝手に挿入される… */
  /*caret-color: transparent;*/
}
</style>
