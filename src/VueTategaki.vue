<template>
  <div class="tategaki"
    :style="boxStyle"
  >
    <button v-show="editing" class="tategaki-input-done" @click="done">done</button>
    <div
      class="tategaki-container"
      ref="container"
      :style="containerStyle"
    >
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
        @keyup.exact="editorKeyUp"
        @keydown.ctrl.65="selectAll"
        @keydown.meta.65="selectAll"
        @keydown.enter.exact="disableBreakLine"
        @paste.prevent="pasteText"
        @focus="focus"
        @blur="focusOut"></div>

      <div
        class="tategaki-preview"
        data-key="editor"
        :data-placeholder="placeholder"
        :data-placeholderactive="placeholderStatus"
        :contenteditable="previewEditable"
        v-html="contentHtml"
        ref="preview"
        @click="selected"></div>

      <div class="caret" ref="caret" :style="caretStyle">
        <svg><rect x="0" y="0" width="100%" height="1"></rect></svg>
      </div>
    </div>
    <div v-if="activeStyles.highlightMenu.enable" class="highlight-menu" :style="highlightMenuStyle">
      <button @click="toBold">B</button>
      <button @click="toHead">T</button>
    </div>
  </div>
</template>

<script>
import merge from 'lodash.merge'
import browser from 'browser-detect'
const ua = browser()

export default {
  name: 'VueTategaki',
  components: {
  },
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
  data () {
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
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          outline: true,
          boxShadow: '0 0 5px 0px rgba(0, 123, 255, .4)',
          fontSize: '16px',
          multiline: true
        },
        caret: {
          display: 'none',
          top: '0px',
          left: '0px'
        },
        highlightMenu: {
          enable: false,
          top: '0px',
          left: '0px',
          display: 'none'
        }
      },
      originalContainerHeight: '',
      iOSKeyboardHeight: '420px',
      innerContent: '',
      previewContent: '',
      compositing: false,
      selecting: false,
      focusing: false
    }
  },
  computed: {
    editContent () {
      return this.indexedHtml(this.innerContent)
    },
    contentHtml () {
      return this.indexedHtml(this.previewContent)
    },
    previewEditable () {
      return this.selecting
    },
    styleContainerOutline () {
      if (!this.activeStyles.container.outline) {
        return false
      }
      return this.selecting || this.focusing
    },
    offsetRight () {
      return parseInt(this.activeStyles.container.fontSize) * 1.5
    },
    caretStyle () {
      return {
        display: this.activeStyles.caret.display,
        width: `${parseInt(this.activeStyles.container.fontSize) * 1.4}px`,
        top: this.activeStyles.caret.top,
        left: this.activeStyles.caret.left
      }
    },
    boxStyle () {
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
    containerStyle () {
      return {
        fontSize: this.activeStyles.container.fontSize,
        minWidth: this.activeStyles.container.minWidth,
        height: this.activeStyles.container.height,
        position: this.activeStyles.container.position,
        top: this.activeStyles.container.top,
        left: this.activeStyles.container.left,
        right: this.activeStyles.container.right,
        bottom: this.activeStyles.container.bottom,
        boxShadow: this.styleContainerOutline ? this.activeStyles.container.boxShadow : ''
      }
    },
    editableStyle () {
      return {
        right: `-${this.offsetRight}px`
      }
    },
    highlightMenuStyle () {
      return {
        top: this.activeStyles.highlightMenu.top,
        left: this.activeStyles.highlightMenu.left,
        display: this.activeStyles.highlightMenu.display
      }
    },
    placeholderStatus () {
      return this.contentHtml === '<p data-key="0">​</p>'
    }
  },
  methods: {
    setBlur () {
      this.focusing = false
    },
    setFocus() {
      this.focusing = true
    },
    setSelection () {
      this.selecting = true
    },
    setDeselection () {
      this.selecting = false
    },
    setBlurAndDeselection () {
      this.focusing = false
      this.selecting = false
    },
    indexedHtml (content) {
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
    cleanHtml (nodes) {
      return [...nodes].map(e => {
        e.removeAttribute('data-key')
        ;[...e.childNodes].map(e => {
          if (e.nodeType === 1) {
            e.removeAttribute('data-key')
          }
        })
        return e.outerHTML
      }).join('').replace('&#8203;', '')
    },
    currentSelectionAndRange () {
      const sel = window.getSelection()
      return { sel: sel, range: sel.getRangeAt(0) }
    },
    sync () {
      const nodes = this.$refs.editable.childNodes
      const cleanHTML = this.cleanHtml(nodes)
      this.previewContent = cleanHTML
      this.$emit('updated', cleanHTML)
    },
    editorKeyUp (e) {
      this.moveCaret(e.target, this.currentSelectionAndRange().range)
    },
    focusAndMoveCaret (e, range) {
      // テキスト以外のエディタ部分をクリックした場合は、フォーカスを末尾へ
      if (e.target.className === 'tategaki-preview') {
        const p = this.$refs.editable.childNodes[this.$refs.editable.childNodes.length - 1]
        if (p.childNodes.length) {
          const t = p.childNodes[p.childNodes.length - 1]
          this.activeFocus(t, t.length)
        } else {
          this.activeFocus(p, 0)
        }
        this.moveCaret(this.$refs.editable, range)
      } else {
        this.moveCaret(e.target, range)
        const activeRange = this.getActiveRange(range, e.target)
        this.mergeTextNode(e.target)
        // MEMO: ここで editor の DOM を全部もとに戻す、こうすうことで re-render させずに node を戻せるっぽい
        this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
        this.focusEditor(activeRange)
      }
    },
    moveCaret (target, range) {
      // MEMO: safari で日本語変換中に node をいじると二重でテキストが入ってしまうため変換中は caret 移動させない
      if (ua.name === 'safari' && this.compositing) {
        this.activeStyles.caret.display = 'none'
      } else {
        this.activeStyles.caret.display = 'block'
        const anchor = document.createElement('span')
        // MEMO: 先頭に空の span いれると座標がずれるため zero-width-space 入れる
        anchor.innerText = '&#8203;'
        range.insertNode(anchor)
        const parent = anchor.closest('[data-key=editor]')
        const pos = anchor.getBoundingClientRect()
        anchor.parentElement.removeChild(anchor)
        const parentPos = this.$refs.preview.getBoundingClientRect()
        const anchorLeft = pos.left - parentPos.left
        const viewerPos = this.$refs.container.getBoundingClientRect()
        const parentOffsetLeft = parentPos.left + document.defaultView.pageXOffset
        const parentLeft = viewerPos.left - parentOffsetLeft
        // MEMO: 相対パスでの座標指定であってもスクローラブルな状態だと left:0 にしても左端に行くわけじゃないので
        // はみでたエディタ右は自分を計算してマイナスで調整している
        const parentRight = parentPos.width - parentLeft - viewerPos.width
        const offset = parent.className === 'tategaki-editable' ? this.offsetRight : 0
        this.activeStyles.caret.top = `${pos.top - parentPos.top}px`
        this.activeStyles.caret.left = anchorLeft - parentLeft - parentRight - 4 - offset + 'px'
      }
    },
    getActiveRange (range, target) {
      // MEMO: 自身の textnode が親から見て何番目のインデックスなのかを知る
      let targetNode = range.startContainer
      let i = 0
      if (range.startContainer.nodeType === 3) {
        while ((targetNode = targetNode.previousSibling) !== null) {
          i++
        }
      }
      return {
        key: target.dataset.key,
        index: i,
        startOffset: range.startOffset
      }
    },
    mergeTextNode (e) {
      // span を差し込むことで textnode が分割されるのをもとに戻す
      let joinNode = ''
      ;[...e.childNodes].forEach(node => {
        if (node.nodeType !== 3) {
          node.innerText = [...node.childNodes].map(node => node.nodeValue).join('')
          joinNode += node.outerHTML
        } else {
          joinNode += node.nodeValue
        }
      })
      e.innerHTML = joinNode
    },
    activeFocus (node, offset) {
      const editorRange = document.createRange()
      const editorSel = window.getSelection()
      editorRange.setStart(node, offset)
      editorRange.collapse(true)
      editorSel.removeAllRanges()
      editorSel.addRange(editorRange)
      this.$refs.editable.focus()
    },
    focusEditor (activeRange) {
      // 指定された node と offset から editor node を探索して focus させる
      const key = activeRange.key
      let targetNode = [...this.$refs.editable.childNodes].find(node => {
        return node.dataset && node.dataset.key === key
      })
      // MEMO: ネストされた node がある場合の対応
      if (!targetNode) {
        targetNode = [...this.$refs.editable.childNodes].map(node => [...node.childNodes]).flat().find(node => {
          return node.dataset && node.dataset.key === key
        })
      }
      if (!targetNode) {
        targetNode = this.$refs.editable.childNodes[0]
      }
      this.activeFocus(targetNode.childNodes[activeRange.index], activeRange.startOffset)
    },
    focus () {
      this.defaultStyles.container.outline = true
    },
    focusOut () {
      this.setBlur()
      this.defaultStyles.container.outline = false
      this.activeStyles.caret.display = 'none'
    },
    selectedRange (e) {
      if (ua.name === 'firefox') {
        const range = document.createRange()
        range.setStart(e.rangeParent, e.rangeOffset)
        return range
      } else if (ua.mobile && ua.os === 'OS X') {
        return document.caretRangeFromPoint(e.clientX, e.clientY)
      }
      return this.currentSelectionAndRange().range
    },
    dontScroll () {
      // TODO: 横スクロールのみ許可して、縦スクロールは禁止したい
    },
    fullScreenForMobile () {
      this.activeStyles.container.height = `calc(100% - ${this.iOSKeyboardHeight})`
      this.activeStyles.box.height = '100%'
      this.activeStyles.box.position = 'fixed'
      this.activeStyles.box.background = '#fff'
      this.activeStyles.container.position = 'fixed'
      document.addEventListener('touchmove', this.dontScroll, { passive: false })
    },
    restoreScreenForMobile () {
      this.activeStyles.box.height = 'auto'
      this.activeStyles.container.height = this.originalContainerHeight
      this.activeStyles.box.position = 'static'
      this.activeStyles.box.background = 'none'
      this.activeStyles.container.position = 'relative'
      document.removeEventListener('touchmove', this.dontScroll, { passive: false })
    },
    done () {
      this.restoreScreenForMobile()
      this.editing = false
    },
    selected (e) {
      console.log('selected')
      const range = this.selectedRange(e)
      // 範囲選択ではない場合はフォーカスさせる
      if (range.startOffset === range.endOffset) {
        this.editing = true
        this.fullScreenForMobile()
        this.setDeselection()
        // MEMO: 選択中にクリックした場合は textnode が分割されているためマージさせる
        this.setFocus()
        this.focusAndMoveCaret(e, range)
      } else {
        this.setSelection()

        // MEMO: 選択した位置の textnode 座標を算出
        // メニューの表示位置に利用している
        if (this.activeStyles.highlightMenu.enable) {
          const anchor = document.createElement('span')
          anchor.innerText = '&#8203;'
          range.insertNode(anchor)
          const pos = anchor.getBoundingClientRect()
          anchor.parentElement.removeChild(anchor)
          this.activeStyles.highlightMenu.display = 'block'
          this.activeStyles.highlightMenu.top = `${pos.y}px`
          this.activeStyles.highlightMenu.left = `${pos.x + 30}px`
        }
      }
    },
    pasteText (e) {
      const text = window.clipboardData ? window.clipboardData.getData('text') : e.clipboardData.getData('text/plain')
      const { sel, range } = this.currentSelectionAndRange()
      const node = document.createTextNode(text)
      range.insertNode(node)
      range.setStartAfter(node)
      range.setEndAfter(node)
      sel.removeAllRanges()
      sel.addRange(range)
      this.sync()
    },
    compositionstart () {
      this.compositing = true
    },
    compositionend () {
      this.compositing = false
    },
    deleteSelectNode (e) {
      if (this.selecting && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.stopPropagation()
        e.preventDefault()

        // MEMO: 選択削除後、キャレットの位置を復元
        const { sel, range } = this.currentSelectionAndRange()

        const acrossNode = range.startContainer !== range.endContainer
        const target = range.startContainer.parentNode
        sel.deleteFromDocument()
        this.moveCaret(this.$refs.preview, range)

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

        // MEMO: ここで editor の DOM を全部もとに戻す、こうすうことで re-render させずに node を戻せるっぽい
        this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
        this.sync()
        this.focusEditor(activeRange)
        this.setBlurAndDeselection()
      }
    },
    selectAll (e) {
      e.stopPropagation()
      e.preventDefault()
      this.selecting = true
      document.activeElement.blur()
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(this.$refs.preview.childNodes[0], 0)
      const endNode = this.$refs.preview.childNodes[this.$refs.preview.childNodes.length - 1]
      range.setEnd(endNode, endNode.childNodes.length)
      sel.removeAllRanges()
      sel.addRange(range)
    },
    disableSwipeBack (e) {
      // TODO: firefox / safari だとうまくうごいていない
      // エディタ以外のスクロールには関与しない
      if (!e.path.find(dom => dom.className === 'content-editable-page') ){
        return
      }
      const container = this.$refs.container.getBoundingClientRect()
      const preview = this.$refs.preview.getBoundingClientRect()
      if (container.x - 2 < preview.x && e.deltaX < 0) {
        e.preventDefault()
      }
    },
    toBold () {
      // MEMO: preview 自体を一時的に contenteditable にして execCommand が効くようにして再代入している
      document.execCommand('bold')
      this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
      this.sync()
      this.setBlurAndDeselection()
    },
    toHead () {
      // MEMO: preview 自体を一時的に contenteditable にして execCommand が効くようにして再代入している
      const sel = window.getSelection()
      if (sel.anchorNode.parentNode.localName === 'h3') {
        document.execCommand('formatBlock', false, '<p>')
      } else {
        document.execCommand('formatBlock', false, '<h3>')
      }
      this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
      this.sync()
      this.setBlurAndDeselection()
    },
    hideHighlightMenu () {
      const sel = window.getSelection()
      // MEMO: 解除はここでやる、メニュー出現は preview 自身を select したときのみなので
      if (sel.rangeCount === 0) {
        this.activeStyles.highlightMenu.display = 'none'
        ;[...this.$refs.preview.childNodes].map(e => {
          this.mergeTextNode(e)
        })
      }
    },
    disableBreakLine (e) {
      if (!this.activeStyles.container.multiline) {
        e.preventDefault()
        return
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
    } else {
      this.previewContent = this.content
      this.innerContent = this.content
    }
    document.execCommand('DefaultParagraphSeparator', false, 'p')
    window.addEventListener('keydown', this.deleteSelectNode, true)
    window.addEventListener('mousewheel', this.disableSwipeBack)
    document.addEventListener('selectionchange', this.hideHighlightMenu)
  },
  destroyed() {
    window.removeEventListener('keydown', this.deleteSelectNode, true)
    window.removeEventListener('mousewheel', this.disableSwipeBack)
    document.removeEventListener('selectionchange', this.hideHighlightMenu)
  }
}
</script>

<style>
.tategaki-container {
  position: relative;
  word-break: break-all;
  writing-mode: vertical-rl;
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
}
[data-placeholder][data-placeholderactive=true]:before {
  content: attr(data-placeholder);
  opacity: 0.5;
  position: absolute;
}
.tategaki-editable, .tategaki-preview {
  user-select: text;
  -webkit-user-select: text;
  caret-color: transparent;
}

.caret {
  position: absolute;
  width: 2px;
}
.caret svg {
  width: inherit;
  height: inherit;
  display: block;
  animation: blinkAnimation;
  animation-duration: 1500ms;
  animation-iteration-count: infinite;
}
.caret svg rect {
  fill: #333;
}
@keyframes blinkAnimation {
  0% { opacity: 0 }
  100% { opacity: 1 }
}

.highlight-menu {
  position: absolute;
  z-index: 10;
  background-color: #000;
  color: #fff;
  border-radius: 3px;
  display: inline-block;
}
.highlight-menu button{
  width: 32px;
  height: 32px;
  display: block;
  background-color: transparent;
  color: #fff;
  font-weight: bold;
  border: 0;
}

.tategaki-input-done {
  position: fixed;
  top: 5px;
  left: 5px;
  z-index: 10000;
  font-size: 24px;
}
</style>
