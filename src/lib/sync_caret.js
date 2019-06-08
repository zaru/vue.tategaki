// 現在、有効な Selection を指定 node の同じ場所に同期させる
export const syncCaret = (node) => {
  const sel = window.getSelection()
  const range = sel.getRangeAt(0)
  const startKey = range.startContainer.parentElement.dataset.key
  const startOffset = range.startOffset
  const endKey = range.endContainer.parentElement.dataset.key
  const endOffset = range.endOffset

  // この時点で editable の node に data-key がかならずあるわけじゃない
  const startNodeChild = [...node.childNodes].find(
    node => node.dataset.key === startKey
  ).childNodes
  const start = [...startNodeChild].find(
    node => node.textContent === range.startContainer.textContent
  )
  const endNodeChild = [...node.childNodes].find(
    node => node.dataset.key === endKey
  ).childNodes
  const end = [...endNodeChild].find(
    node => node.textContent === range.endContainer.textContent
  )
  const newRange = document.createRange()
  newRange.setStart(start, startOffset)
  newRange.setEnd(end, endOffset)
  sel.removeAllRanges()
  sel.addRange(newRange)
}
