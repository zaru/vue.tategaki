export const horizontalMove = (e) => {
  const sel = window.getSelection()
  const range = sel.getRangeAt(0)
  const startOffset = e.keyCode === 38 ? -1 : 1
  if (range.commonAncestorContainer.nodeValue === null) {
    // TODO: Node またぎの移動をサポートする
  } else if (
    range.commonAncestorContainer.nodeValue.length >=
    range.startOffset + startOffset &&
    0 <= range.startOffset + startOffset
  ) {
    range.setStart(sel.anchorNode, range.startOffset + startOffset)
    range.setEnd(sel.anchorNode, range.startOffset)
  }
}

export const verticalMove = (e, caretElement, fontSize) => {
  const caretRect = caretElement.getBoundingClientRect()
  let newX = caretRect.x
  let newY = caretRect.y
  if (e.keyCode === 37) {
    newX -= parseInt(fontSize)
  } else if (e.keyCode === 39) {
    newX += parseInt(fontSize) * 2 + 10
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
  return {
    event: dummyEvt,
    range: range
  }
}
