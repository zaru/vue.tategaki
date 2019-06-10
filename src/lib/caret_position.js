// caret の座標を取得して返す
const getPositionAtLast = clone => {
  // なぜかここで全角を入れないと caret 座標が途中から正常な値にならなくなる…
  const shadowCaret = document.createTextNode('　')
  clone.insertNode(shadowCaret)
  clone.selectNode(shadowCaret)
  const rect = clone.getBoundingClientRect()
  const parent = shadowCaret.parentNode
  shadowCaret.parentNode.removeChild(shadowCaret)
  clone.detach()
  // 空白の TextNode ができてしまうため remove したあとに normalize で完全に削除する
  parent.normalize()
  return rect
}

const getPosition = (clone, range, fixedPosition) => {
  if (range.endContainer.nodeName === 'BR') {
    clone.setStart(range.endContainer.parentNode, fixedPosition)
    clone.setEnd(range.endContainer.parentNode, fixedPosition + 1)
    return getPositionAtLast(clone)
  } else if (range.endContainer.textContent === '') {
    return getPositionAtLast(clone)
  }
  clone.setStart(range.endContainer, fixedPosition)
  clone.setEnd(range.endContainer, fixedPosition + 1)
  const rect = clone.getBoundingClientRect()
  clone.detach()
  return rect
}

const currentRange = () => {
  return window.getSelection().getRangeAt(0)
}

const canAdjust = () => {
  const target = currentRange().startContainer.parentElement.closest(
    '[data-key=editor]'
  )
  return target && target.className === 'tategaki-editable'
}

export const position = () => {
  const range = currentRange()
  const clone = range.cloneRange()
  const fixedPosition = range.endOffset
  if (fixedPosition + 1 > range.endContainer.length) {
    return getPositionAtLast(clone)
  }
  return getPosition(clone, range, fixedPosition)
}

export const offset = (parent, viewer, adjustment) => {
  adjustment = canAdjust() ? adjustment : 0
  const pos = position()
  const parentPos = parent.getBoundingClientRect()
  const anchorLeft = pos.left - parentPos.left
  const viewerPos = viewer.getBoundingClientRect()
  const parentOffsetLeft = parentPos.left + document.defaultView.pageXOffset
  const parentLeft = viewerPos.left - parentOffsetLeft
  // MEMO: 相対パスでの座標指定であってもスクローラブルな状態だと left:0 にしても左端に行くわけじゃないので
  // はみでたエディタ右は自分を計算してマイナスで調整している
  const parentRight = parentPos.width - parentLeft - viewerPos.width
  return {
    top: pos.top - parentPos.top,
    left: anchorLeft - parentLeft - parentRight - 4 - adjustment
  }
}
