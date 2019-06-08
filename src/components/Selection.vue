<template>
  <div ref="selection">
    <div ref="first" class="selection" :style="firstStyle"></div>
    <div ref="middle" class="selection" :style="middleStyle"></div>
    <div ref="last" class="selection" :style="lastStyle"></div>
  </div>
</template>

<script>
export default {
  name: 'Selection',
  components: {},
  props: {
    parent: {
      type: HTMLDivElement,
      require: true
    },
    content: {
      type: String,
      require: true
    },
    doSelectionAll: {
      type: Boolean,
      require: true
    }
  },
  data() {
    return {
      first: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      },
      middle: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      },
      last: {
        width: 0,
        height: 0,
        top: 0,
        left: 0
      },
      memoSelectedWidth: 0,
      memoSelectedStartOffset: 0
    }
  },
  watch: {
    content() {
      this.resetAll()
    },
    doSelectionAll() {
      if (this.doSelectionAll) {
        this.selectAll()
      }
    }
  },
  computed: {
    firstStyle() {
      return {
        width: `${this.first.width}px`,
        height: `${this.first.height}px`,
        top: `${this.first.top}px`,
        left: `${this.first.left}px`
      }
    },
    middleStyle() {
      return {
        width: `${this.middle.width}px`,
        height: `${this.middle.height}px`,
        top: `${this.middle.top}px`,
        left: `${this.middle.left}px`
      }
    },
    lastStyle() {
      return {
        width: `${this.last.width}px`,
        height: `${this.last.height}px`,
        top: `${this.last.top}px`,
        left: `${this.last.left}px`
      }
    }
  },
  methods: {
    resetAll() {
      this.first.width = 0
      this.first.height = 0
      this.first.top = 0
      this.first.left = 0
      this.resetMiddleAndLast()
    },
    resetMiddleAndLast() {
      this.last.width = 0
      this.last.height = 0
      this.last.top = 0
      this.last.left = 0
      this.middle.width = 0
      this.middle.height = 0
      this.middle.top = 0
      this.middle.left = 0
    },
    selection() {
      // MEMO: 自身に関係ないイベントは無視している
      const sel = window.getSelection()
      if (sel.rangeCount === 0) {
        return
      }
      const range = sel.getRangeAt(0)
      const parentPreview = range.startContainer.parentElement.closest(
        '.tategaki-preview'
      )
      if (parentPreview === this.parent) {
        this.makeSelectionInPreview(range)
      }
    },
    makeSelectionInPreview(range) {
      if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
        return
      }

      const rect = range.getBoundingClientRect()
      const parentRect = this.$refs.selection.parentElement
        .closest('.tategaki-container')
        .getBoundingClientRect()

      if (this.first.width === 0) {
        // MEMO: cloneNode は値をコピーして互いに影響を与えないはずなんだけど
        // 対象の TextNode が分割されたりで影響しているような気がする…
        // insertNode が対象の TextNode にたいして行っているから…か。うーん
        //
        // 選択時に真横に移動しとき、初回 Range 取得で2行分になってしまうため
        // 1文字分の幅を取得するためにダミーを挿入
        const clone = range.cloneRange()
        const shadowCaret = document.createTextNode('　')
        clone.insertNode(shadowCaret)
        clone.selectNode(shadowCaret)
        const rect = clone.getBoundingClientRect()
        shadowCaret.parentNode.removeChild(shadowCaret)
        clone.detach()
        this.first.width = rect.width
      }

      const textRange = document.createRange()
      if (range.startOffset + 1 <= range.startContainer.textContent.length) {
        textRange.setStart(range.startContainer, range.startOffset)
        textRange.setEnd(range.startContainer, range.startOffset + 1)
        const textRect = textRange.getBoundingClientRect()
        this.first.top = textRect.top - parentRect.top
        this.first.left = textRect.left - parentRect.left
      }
      if (range.endOffset > 0 && this.first.top > 0) {
        textRange.setStart(range.endContainer, range.endOffset - 1)
        textRange.setEnd(range.endContainer, range.endOffset)
        const textRect = textRange.getBoundingClientRect()
        this.first.height =
          textRect.top - parentRect.top - this.first.top + textRect.height
      }

      if (this.first.width < rect.width) {
        this.first.height = rect.height - this.first.top

        if (range.endOffset > 0) {
          this.last.width = this.first.width
          this.last.left = rect.left - parentRect.left
          this.last.top = rect.top - parentRect.top
          textRange.setStart(range.endContainer, range.endOffset - 1)
          textRange.setEnd(range.endContainer, range.endOffset)
          const textRect = textRange.getBoundingClientRect()
          this.last.height = textRect.y - parentRect.top + textRect.height
        }

        this.middle.width = rect.width - this.first.width - this.last.width
        this.middle.height = rect.height
        this.middle.top = rect.top - parentRect.top
        this.middle.left = rect.left - parentRect.left + this.first.width
      } else {
        this.resetMiddleAndLast()
      }

      textRange.detach()
    },
    selectAll() {
      this.parent.childNodes.forEach(node => {
        node.style.background = 'rgba(255, 0, 0, .5)'
      })
    }
  },
  mounted() {
    document.addEventListener('selectionchange', this.selection)
    document
      .querySelector('.tategaki-editable')
      .addEventListener('blur', this.resetAll)
  },
  destroyed() {
    document.removeEventListener('selectionchange', this.selection)
    document
      .querySelector('.tategaki-editable')
      .removeEventListener('blur', this.resetAll)
  }
}
</script>

<style scoped>
.selection {
  position: absolute;
  background: #f00;
  opacity: 0.5;
}
</style>
