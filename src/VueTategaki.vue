<template>
  <div class="tategaki" ref="box" :style="boxStyle">
    <button v-show="editing" class="tategaki-input-done" @click="done">
      🔙️
    </button>
    <div class="tategaki-container" ref="container" :style="containerStyle">
      <div
        contenteditable="true"
        class="tategaki-editable"
        data-key="editor"
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
        @keydown.ctrl.65="selectAll"
        @keydown.meta.65="selectAll"
        @keydown.meta.90.prevent.stop="undo"
        @keydown.enter.exact="disableBreakLine"
        @paste.prevent="pasteText"
        @focus="focus"
        @blur="focusOut"
      ></div>

      <div
        class="tategaki-preview"
        data-key="editor"
        :data-placeholder="placeholder"
        :data-placeholderactive="placeholderStatus"
        :contenteditable="previewEditable"
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
      ></caret>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import browser from 'browser-detect'
import Caret from './components/Caret.vue'
import StackBuffer from './lib/stack_buffer'
import { paste } from './lib/copy_paste'
const ua = browser()

export default {
  name: 'VueTategaki',
  components: { Caret },
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
      selecting: false,
      focusing: false,
      memoRange: {
        startContainer: null,
        endContainer: null,
        startOffset: 0,
        endOffset: 0
      },
      showCaret: false
    }
  },
  computed: {
    editContent() {
      return this.indexedHtml(this.innerContent)
    },
    contentHtml() {
      return this.indexedHtml(this.previewContent)
    },
    previewEditable() {
      return this.selecting
    },
    styleContainerOutline() {
      if (!this.activeStyles.container.outline) {
        return false
      }
      return this.selecting || this.focusing
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
        bottom: this.activeStyles.container.bottom,
        boxShadow: this.styleContainerOutline
          ? this.activeStyles.container.boxShadow
          : ''
      }
    },
    editableStyle() {
      return {
        right: `-${this.offsetRight}px`
      }
    },
    placeholderStatus() {
      return this.contentHtml === '<p data-key="0">​</p>'
    }
  },
  methods: {
    setBlur() {
      this.focusing = false
    },
    setFocus() {
      this.focusing = true
    },
    setSelection() {
      this.selecting = true
    },
    setDeselection() {
      this.selecting = false
    },
    setBlurAndDeselection() {
      this.focusing = false
      this.selecting = false
    },
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
    arrowKeyMove(e) {
      // TODO: 別モジュールに切り出す
      if (e.keyCode === 38 || e.keyCode === 40) {
        const sel = window.getSelection()
        const range = sel.getRangeAt(0)
        const startOffset = e.keyCode === 38 ? -1 : 1
        if (range.commonAncestorContainer.nodeValue === null) {
          // TODO: Node またぎの移動をサポートする
        } else if (range.commonAncestorContainer.nodeValue.length >= range.startOffset + startOffset && 0 <= range.startOffset + startOffset) {
          range.setStart(sel.anchorNode, range.startOffset + startOffset)
          range.setEnd(sel.anchorNode, range.startOffset)
        }
      } else if (e.keyCode === 37 || e.keyCode === 39) {
        const caretRect = this.$refs.caret.$el.getBoundingClientRect()
        let newX = caretRect.x
        let newY = caretRect.y
        if (e.keyCode === 37) {
          newX -= 50
        } else if (e.keyCode === 39) {
          newX += 90
        }
        let range, elem
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(newX, newY)
          elem = document.elementFromPoint(newX, newY)
        } else {
          const pos = document.caretPositionFromPoint(newX, newY)
          elem = document.elementFromPoint(newX, newY)
          range = document.createRange()
          range.setStart(pos.offsetNode, pos.offset)
        }
        const dummyEvt = {
          target: elem
        }
        this.focusAndMoveCaret(dummyEvt, range)
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
        // this.mergeTextNode(e.target)
        // MEMO: ここで editor の DOM を全部もとに戻す、こうすうことで re-render させずに node を戻せるっぽい
        this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
        this.focusEditor(activeRange)
      }
    },
    getActiveRange(range, target) {
      // MEMO: 自身の textnode が親から見て何番目のインデックスなのかを知る
      let targetNode = range.startContainer
      let i = 0
      if (range.startContainer.nodeType === 3) {
        while ((targetNode = targetNode.previousSibling) !== null && targetNode.textContent !== '') {
          i++
        }
      }
      return {
        key: target.dataset.key,
        index: i,
        startOffset: range.startOffset
      }
    },
    mergeTextNode(e) {
      // span を差し込むことで textnode が分割されるのをもとに戻す
      let joinNode = ''
      ;[...e.childNodes].forEach(node => {
        if (node.nodeType !== 3) {
          node.innerText = [...node.childNodes]
            .map(node => node.nodeValue)
            .join('')
          joinNode += node.outerHTML
        } else {
          joinNode += node.nodeValue
        }
      })
      e.innerHTML = joinNode
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
      // TODO: キーボードがせり上がったときの高さ調整及びスクロールさせないための何かが必要
      if (ua.mobile && ua.name === 'safari') {
        this.activeStyles.container.height = `${document.documentElement
          .clientHeight - 310}px`
      }
    },
    focusEditor(activeRange) {
      // 指定された node と offset から editor node を探索して focus させる
      const key = activeRange.key
      let targetNode = [...this.$refs.editable.childNodes].find(node => {
        return node.dataset && node.dataset.key === key
      })
      // MEMO: ネストされた node がある場合の対応
      if (!targetNode) {
        targetNode = [...this.$refs.editable.childNodes]
          .map(node => [...node.childNodes])
          .flat()
          .find(node => {
            return node.dataset && node.dataset.key === key
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
      this.setBlur()
      this.defaultStyles.container.outline = false
      this.activeStyles.caret.display = 'none'
    },
    selectedRange(e) {
      if (ua.name === 'firefox') {
        const range = document.createRange()
        range.setStart(e.rangeParent, e.rangeOffset)
        return range
      } else if (ua.mobile && ua.os === 'OS X') {
        // MEMO: appendChild などで DOM 構造を変更すると、Range オブジェクトの中身が勝手に変わってしまうので
        // 中身を抜き出してメモしておく。実際に使うときに createRange で再生性する
        const range = document.caretRangeFromPoint(e.clientX, e.clientY)
        this.memoRange.startContainer = range.startContainer
        this.memoRange.endContainer = range.endContainer
        this.memoRange.startOffset = range.startOffset
        this.memoRange.endOffset = range.endOffset
        return range
      }
      return this.currentSelectionAndRange().range
    },
    dontScroll() {
      // TODO: 横スクロールのみ許可して、縦スクロールは禁止したい
    },
    fullScreenForMobile() {
      this.originalParentNode = this.$refs.box.parentNode
      if (this.$refs.box.nextSibling) {
        this.originalNextNode = this.$refs.box.nextSibling
      }
      document.body.appendChild(this.$refs.box)
      this.activeStyles.container.height = '100%'
      this.activeStyles.box.height = '100%'
      this.activeStyles.box.position = 'fixed'
      this.activeStyles.box.background = '#fff'
      this.activeStyles.container.position = 'fixed'
      document.addEventListener('touchmove', this.dontScroll, {
        passive: false
      })
    },
    restoreScreenForMobile() {
      if (this.originalNextNode) {
        this.originalParentNode.insertBefore(
          this.$refs.box,
          this.originalNextNode
        )
      } else {
        this.originalParentNode.appendChild(this.$refs.box)
      }
      this.activeStyles.box.height = 'auto'
      this.activeStyles.container.height = this.originalContainerHeight
      this.activeStyles.box.position = 'static'
      this.activeStyles.box.background = 'none'
      this.activeStyles.container.position = 'relative'
      document.removeEventListener('touchmove', this.dontScroll, {
        passive: false
      })
    },
    done() {
      this.restoreScreenForMobile()
      this.editing = false
    },
    waitingPaintAndFocusForMobileSafari(e) {
      const target = this.$refs.box
      const observer = new MutationObserver(() => {
        const newRange = document.createRange()
        newRange.setStart(
          this.memoRange.startContainer,
          this.memoRange.startOffset
        )
        newRange.setEnd(this.memoRange.endContainer, this.memoRange.endOffset)
        this.focusAndMoveCaret(e, newRange)
        observer.disconnect()
      })
      const options = {
        attributes: true,
        attributeFilter: ['style']
      }
      observer.observe(target, options)
    },
    selected(e) {
      // TODO: ここで文字列選択時に offset が 0 になるのがバグの原因
      // テキスト選択時、text node がなぜか分割されておかしくなっているっぽい
      const range = this.selectedRange(e)
      // 範囲選択ではない場合はフォーカスさせる
      if (range.startOffset === range.endOffset) {
        //監視ターゲットの取得
        if (
          ua.mobile &&
          ua.name === 'safari' &&
          this.activeStyles.box.position !== 'fixed'
        ) {
          this.editing = true
          // App.vue の example では問題なくキーボードが起動するが
          // noco に組み込むとキーボードが起動しない…
          this.waitingPaintAndFocusForMobileSafari(e, range)
          this.fullScreenForMobile()
          // ふつうにこちらでやればキーボードは起動するが caret 位置はぶっ飛ぶ…困る
          // this.focusAndMoveCaret(e, range)

          // MEMO: キーボードがせり上がってきたときに入力欄が上にスライドしてしまうので
          setTimeout(() => {
            window.scrollTo(0, 0)
          }, 100)
        } else {
          this.showCaret = true
          this.focusAndMoveCaret(e, range, false)
        }
        this.setDeselection()
        this.setFocus()
      } else {
        this.setSelection()
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
    deleteSelectNode(e) {
      if (this.selecting && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.stopPropagation()
        e.preventDefault()

        // MEMO: 選択削除後、キャレットの位置を復元
        const { sel, range } = this.currentSelectionAndRange()

        const acrossNode = range.startContainer !== range.endContainer
        const target = range.startContainer.parentNode
        sel.deleteFromDocument()

        const activeRange = this.getActiveRange(range, target)
        // MEMO: node またぎのときには先頭 node の末尾にキャレットを移動させる
        if (acrossNode) {
          activeRange.startOffset = target.innerText.length
        }
        this.mergeTextNode(target)

        // MEMO: 全て消した場合、なにもないと入力できないので zero-width-space を入れる
        if (!this.$refs.preview.innerText) {
          this.$refs.preview.innerHTML = '<p>&#8203;</p>'
        }
        this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
        this.focusEditor(activeRange)
        this.sync()
        this.setBlurAndDeselection()
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // MEMO: 本当は Caret component のメソッドを直接呼びたくなかったが
        // delete イベントを拾うことができないので親から呼び出すようにしている
        setTimeout(() => {
          this.$refs.caret.moveCaret()
        }, 0)
      }
    },
    selectAll(e) {
      e.stopPropagation()
      e.preventDefault()
      this.selecting = true
      document.activeElement.blur()
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(this.$refs.preview.childNodes[0], 0)
      const endNode = this.$refs.preview.childNodes[
        this.$refs.preview.childNodes.length - 1
      ]
      range.setEnd(endNode, endNode.childNodes.length)
      sel.removeAllRanges()
      sel.addRange(range)
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
        newRange.setStart(
          buffer.range.startContainer,
          buffer.range.startOffset
        )
        newRange.setEnd(buffer.range.endContainer, buffer.range.endOffset)
        this.focusAndMoveCaret({target: this.$refs.editable}, newRange)
      }
    }
  },
  created() {
    this.activeStyles = merge(this.defaultStyles, this.styles)
    this.originalContainerHeight = this.activeStyles.container.height
  },
  mounted() {
    if (!this.content) {
      this.previewContent = '<p>&#8203;</p>'
      this.innerContent = '<p>&#8203;</p>'
      this.stackContent = '<p>&#8203;</p>'
    } else {
      this.previewContent = this.content
      this.innerContent = this.content
      this.stackContent = this.content
    }
    document.execCommand('DefaultParagraphSeparator', false, 'p')
    window.addEventListener('keydown', this.deleteSelectNode, true)
    window.addEventListener('mousewheel', this.disableSwipeBack)
  },
  destroyed() {
    window.removeEventListener('keydown', this.deleteSelectNode, true)
    window.removeEventListener('mousewheel', this.disableSwipeBack)
  }
}
</script>

<style>
.tategaki-container {
  position: relative;
  word-break: break-all;
  writing-mode: vertical-rl;
  overflow-y: hidden;
  overflow-x: scroll;
}
.tategaki-container p {
  margin: 0;
  padding: 0;
}
.tategaki-editable {
  box-sizing: border-box;
  position: absolute;
  z-index: -1;
  top: 0px;
  opacity: 0;
  color: #f00;
  background-color: #ddd;
}
.tategaki-preview {
  box-sizing: border-box;
  opacity: 1;
  z-index: 2;
  position: absolute;
  top: 0px;
  right: 0px;
}
[data-placeholder][data-placeholderactive='true']:before {
  content: attr(data-placeholder);
  opacity: 0.5;
  position: absolute;
}
.tategaki-editable,
.tategaki-preview {
  user-select: text;
  -webkit-user-select: text;
  caret-color: transparent;
}

.tategaki-input-done {
  position: fixed;
  top: 5px;
  left: 5px;
  z-index: 10000;
  font-size: 18px;
  background: none;
  border: none;
}
</style>
