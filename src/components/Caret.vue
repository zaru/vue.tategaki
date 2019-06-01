<template>
  <div v-show="visible" class="caret" ref="caret" :style="caretStyle">
    <svg><rect x="0" y="0" width="100%" height="1"></rect></svg>
  </div>
</template>

<script>
import browser from 'browser-detect'
import { offset } from '../lib/caret_position'
const ua = browser()

export default {
  name: 'Caret',
  components: {},
  props: {
    fontSize: {
      type: String,
      require: true
    },
    adjust: {
      type: Boolean,
      default: false
    },
    parent: {
      type: HTMLDivElement,
      require: true
    },
    viewer: {
      type: HTMLDivElement,
      require: true
    },
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      style: {
        display: 'none',
        top: '0px',
        left: '0px'
      }
    }
  },
  computed: {
    caretStyle() {
      return {
        width: `${parseInt(this.fontSize) * 1.4}px`,
        height: '1px',
        top: this.style.top,
        left: this.style.left
      }
    },
    offsetRight() {
      const ratio = ua.os.includes('Windows') ? 2.5 : 1.5
      return parseInt(this.fontSize) * ratio
    }
  },
  methods: {
    moveCaret() {
      // MEMO: safari で日本語変換中に node をいじると二重でテキストが入ってしまうため変換中は caret 移動させない
      if (ua.name === 'safari' && this.compositing) {
        this.style.display = 'none'
      } else {
        const pos = offset(this.parent, this.viewer, this.offsetRight)
        this.style.top = `${pos.top}px`
        this.style.left = `${pos.left}px`
      }
    }
  },
  mounted() {
    document.addEventListener('selectionchange', this.moveCaret)
  },
  destroyed() {
    document.removeEventListener('selectionchange', this.moveCaret)
  }
}
</script>

<style>
.caret {
  display: block;
  position: absolute;
  width: 2px;
  z-index: 1;
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
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
