<template>
  <div class="editor">
    <div class="content-editable-page"
         ref="container"
         :style="containerStyle">
      <div
        contenteditable="true" class="editable"
        v-html="editContent"
        ref="editable"
        @compositionstart="compositionstart"
        @compositionend="compositionend"
        @input="sync"
        @keyup.exact="editorKeyUp"
        @keyup.enter="scrollLeft"
        @keydown.meta.65="selectAll"
        @paste.prevent="pasteText"
        @focus="focus"
        @blur="focusOut"></div>

      <div
        class="preview"
        :contenteditable="getPreviewEditable"
        v-html="contentHtml"
        ref="preview"
        @click="selected"></div>

      <div class="caret" ref="caret" :style="caretStyle">
        <svg><rect x="0" y="0" width="100%" height="1"></rect></svg>
      </div>

      <!--<div contenteditable="true" style="{position: absolute; top: 500px;}">abced</div>-->
    </div>
    <div class="highlight-menu" :style="highlightMenuStyle">
      <button @click="toBold">B</button>
      <button @click="toHead">T</button>
    </div>
  </div>
</template>

<script>
import browser from 'browser-detect'
const ua = browser()

export default {
  name: 'VueTategaki',
  components: {
  },
  props: {
    content: {
      type: String
    }
  },
  data () {
    return {
      innerContent: '',
      previewContent: '',
      caret: {
        style: {
          display: 'none',
          width: '22px',
          top: '0px',
          left: '0px'
        }
      },
      container: {
        style: {
          boxShadow: 'none'
        }
      },
      highlightMenu: {
        style: {
          top: '0px',
          left: '0px',
          display: 'none'
        }
      },
      compositing: false,
      selecting: false,
      previewEditable: false
    }
  },
  computed: {
    getPreviewEditable () {
      return this.previewEditable ? 'true' : 'false'
    },
    editContent: {
      get () {
        // MEMO: 識別用の data-key を付与する
        const div = document.createElement('div')
        div.innerHTML = this.innerContent
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
      set (value) {
        console.log('ここが実行されることはないはず: ', value)
        return this.innerContent = value
      }
    },
    contentHtml () {
      // MEMO: 識別用の data-key を付与する
      const div = document.createElement('div')
      div.innerHTML = this.previewContent
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
    caretStyle () {
      return {
        display: this.caret.style.display,
        width: this.caret.style.width,
        top: this.caret.style.top,
        left: this.caret.style.left
      }
    },
    containerStyle () {
      return {
        boxShadow: this.container.style.boxShadow
      }
    },
    highlightMenuStyle () {
      return {
        top: this.highlightMenu.style.top,
        left: this.highlightMenu.style.left,
        display: this.highlightMenu.style.display
      }
    }
  },
  methods: {
    sync () {
      const nodes = this.$refs.editable.childNodes
      // MEMO: データベースに保存する必要のない属性などは削除する
      // 実際はもっとクレジングが必要な気がする
      // const cleanHTML = [...e.target.childNodes].map(e => {
      const cleanHTML = [...nodes].map(e => {
        e.removeAttribute('data-key')
        ;[...e.childNodes].map(e => {
          if (e.nodeType === 1) {
            e.removeAttribute('data-key')
          }
        })
        return e.outerHTML
      }).join('')
      this.previewContent = cleanHTML
      this.$emit('updated', cleanHTML)
    },
    editorKeyUp (e) {
      this.moveCaret(e.target, null, e, 'keyup')
    },
    focusAndMoveCaret (e, range) {
      console.log('Class: , Function: , Line 168 e, range: ', e, range)
      // テキスト以外のエディタ部分をクリックした場合は、フォーカスを末尾へ
      if (e.target.className === 'preview') {
        const p = this.$refs.editable.childNodes[this.$refs.editable.childNodes.length - 1]
        const t = p.childNodes[p.childNodes.length - 1]
        this.activeFocus(t, t.length)
        this.moveCaret(this.$refs.editable, null, e)
      } else {
        this.moveCaret(e.target, null, e)
        // クリックした位置の range を前もって抜き出しておく
        // mergeTextNode で内包 node を書き換えてしまうと range 情報が失われてしまうので
        if (!range) {
          // const previewSel = window.getSelection()
          // range = previewSel.getRangeAt(0)
          range = document.caretRangeFromPoint(e.clientX, e.clientY)
        }
        const activeRange = this.getActiveRange(range, e.target)
        this.mergeTextNode(e.target)
        // MEMO: ここで editor の DOM を全部もとに戻す、こうすうことで re-render させずに node を戻せるっぽい
        this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
        this.focusEditor(activeRange)
      }
    },
    moveCaret (target, range, e, mode) {
      if (!range) {
        const sel = window.getSelection()
        // TODO: ここで keyup 分岐をしている箇所をリファクタリングする
        // 具体的には Range オブジェクトを返す関数を定義して差分を吸収させる
        if (mode === 'keyup' || ua.name === 'firefox') {
          range = sel.getRangeAt(0)
        } else {
          range = document.caretRangeFromPoint(e.clientX, e.clientY)
        }
      }
      // MEMO: safari で日本語変換中に node をいじると二重でテキストが入ってしまうため変換中は caret 移動させない
      if (ua.name === 'safari' && this.compositing) {
        this.caret.style.display = 'none'
      } else {
        this.caret.style.display = 'block'
        const anchor = document.createElement('span')
        // MEMO: 先頭に空の span いれると座標がずれるため zero-width-space 入れる
        anchor.innerText = '&#8203;'
        range.insertNode(anchor)
        const pos = anchor.getBoundingClientRect()
        anchor.parentElement.removeChild(anchor)
        const parentPos = this.$refs.preview.getBoundingClientRect()
        const anchorLeft = pos.left - parentPos.left
        const viewerPos = this.$refs.container.getBoundingClientRect()
        const parentOffsetLeft = parentPos.left + document.defaultView.pageXOffset
        const parentLeft = viewerPos.left - parentOffsetLeft
        // MEMO: 相対パスでの座標指定であってもすくローラブルな状態だと left:0 にしても左端に行くわけじゃないので
        // はみでたエディタ右は自分を計算してマイナスで調整している
        const parentRight = parentPos.width - parentLeft - viewerPos.width
        const offset = target.className === 'editable' ? 28 : 0
        this.caret.style.top = `${pos.top - parentPos.top}px`
        this.caret.style.left = anchorLeft - parentLeft - parentRight - 28 + 2 - offset + 'px'
      }
    },
    offset(el) {
      const rect = el.getBoundingClientRect(),
        scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
        scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
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
      this.activeFocus(targetNode.childNodes[activeRange.index], activeRange.startOffset)
    },
    focus () {
      this.container.style.boxShadow = '0 0 5px 0px rgba(0, 123, 255, .4)'
    },
    focusOut () {
      if (!this.selecting) {
        this.container.style.boxShadow = 'none'
      }
      this.caret.style.display = 'none'
    },
    selected (e) {
      // TODO: 文字列選択後、別の箇所をクリックすると textnode が分割されているため
      // ここで textnode 結合をしているが…クリックした時点でおそらく  window.getSelection() は決まってる
      // 謎
      if (this.selecting) {
        ;[...this.$refs.preview.childNodes].map(e => {
          this.mergeTextNode(e)
        })
      }
      let range
      if (ua.name === 'firefox') {
        range = document.createRange()
        range.setStart(e.rangeParent, e.rangeOffset)
      } else if (ua.mobile && ua.os === 'OS X') {
        range = document.caretRangeFromPoint(e.clientX, e.clientY)
      } else {
        const sel = window.getSelection()
        range = sel.getRangeAt(0)
      }
      // 範囲選択ではない場合はフォーカスさせる
      if (range.startOffset === range.endOffset) {
        // MEMO: 選択中にクリックした場合は textnode が分割されているためマージさせる

        this.focusAndMoveCaret(e, range)
        this.previewEditable = false
      } else {
        this.selecting = true
        this.previewEditable = true

        // MEMO: 選択した位置の textnode 座標を算出
        // メニューの表示位置に利用している
        const anchor = document.createElement('span')
        anchor.innerText = '&#8203;'
        range.insertNode(anchor)
        const pos = anchor.getBoundingClientRect()
        anchor.parentElement.removeChild(anchor)
        this.highlightMenu.style.display = 'block'
        this.highlightMenu.style.top = `${pos.y}px`
        this.highlightMenu.style.left = `${pos.x + 30}px`
      }
    },
    pasteText (e) {
      const text = window.clipboardData ? window.clipboardData.getData('text') : e.clipboardData.getData('text/plain')
      const sel = window.getSelection()
      const range = sel.getRangeAt(0)
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
        const sel = window.getSelection()
        const range = sel.getRangeAt(0)

        const acrossNode = range.startContainer !== range.endContainer
        const target = range.startContainer.parentNode
        sel.deleteFromDocument()
        this.moveCaret(this.$refs.preview, range, e)

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
        this.focusEditor(activeRange)
        this.selecting = false
      }
    },
    selectAll (e) {
      // TODO: Windows の場合は ctrl なので、それにも対応させる
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
    scrollLeft () {
      // MEMO: 改行したときに少しだけ横スクロールしてテキストが隠れないようにする
      if (!this.isComposing) {
        const cursorRect = this.$refs.caret.getBoundingClientRect()
        const containerRect = this.$refs.container.getBoundingClientRect()
        if (cursorRect.x - containerRect.x < containerRect.width / 2) {
          this.$refs.container.scrollLeft -= 30
        }
      }
    },
    toBold () {
      // MEMO: preview 自体を一時的に contenteditable にして execCommand が効くようにして再代入している
      document.execCommand('bold')
      this.$refs.editable.innerHTML = this.$refs.preview.innerHTML
      this.sync()
      this.previewEditable = false
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
      this.previewEditable = false
    },
    selectChange () {
      const sel = window.getSelection()
      // MEMO: 解除はここでやる、メニュー出現は preview 自身を select したときのみなので
      if (sel.rangeCount === 0) {
        this.highlightMenu.style.display = 'none'
        // TODO: 分割された textnode をぜんぶマージ、パフォーマンス悪そう
        // 本当は選択した位置の textnode だけをマージしたい。どこかにメモする？
        ;[...this.$refs.preview.childNodes].map(e => {
          this.mergeTextNode(e)
        })
      }
    }
  },
  mounted() {
    this.previewContent = this.content
    this.innerContent = this.content
    document.execCommand('DefaultParagraphSeparator', false, 'p')
    window.addEventListener('keydown', this.deleteSelectNode, true)
    window.addEventListener('mousewheel', this.disableSwipeBack)
    document.addEventListener('selectionchange', this.selectChange)
  },
  destroyed() {
    window.removeEventListener('keydown', this.deleteSelectNode, true)
    window.removeEventListener('mousewheel', this.disableSwipeBack)
    document.removeEventListener('selectionchange', this.selectChange)
  }
}
</script>

<style scoped>
.content-editable-page {
  border: 1px solid #f0f0f0;
  overflow: scroll;
  width: 400px;
  height: 500px;
  margin: auto;
  position: relative;
  word-break: break-all;
  writing-mode: vertical-rl;
}
.editable {
  box-sizing: border-box;
  position: absolute;
  z-index: 2;
  top: 0px;
  padding: 1rem;
  /*caret-color: transparent;*/
  opacity: 0;
}
.preview {
  border-radius: 3px;
  box-sizing: border-box;
  position: absolute;
  z-index: 3;
  top: 0px;
  right: 28px;
  opacity: 1;
  padding: 1rem;
}
.editable, .preview {
  /*padding-left: 3rem;*/
  /* TODO: ここを100% にしないと width が自動計算になって各種計算が小数点でずれる…
     でも auto にしないと横スクロール時の戻るアクションキャンセル判定の計算が面倒くさい
  */
  /*width: 100%;*/
  user-select: text;
  -webkit-user-select: text;
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

.editor {
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
</style>
