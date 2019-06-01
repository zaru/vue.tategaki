const getRangeAndOffsetInTheText = (range) => {
  let container
  for (let i = range.endContainer.childNodes.length - 2; i >= 0; i--) {
    if (range.endContainer.childNodes[i].nodeType !== 3) {
      container = range.endContainer.childNodes[i].childNodes[0]
      break
    }
  }
  return {
    node: container,
    offset: container.textContent.length
  }
}

const getRangeAndOffsetAtBottom = (range) => {
  return {
    node: range.endContainer,
    offset: 0
  }
}

const hasBreakLine = (text) => {
  return text.includes('\n')
}

const getNode = (text) => {
  if (hasBreakLine(text)) {
    const cleanHTMLs = text.split('\n').map(line => {
      return line ? `<p>${line}</p>` : `<p><br></p>`
    })
    const cleanHTML = cleanHTMLs.join('')
    const range = document.createRange()
    return range.createContextualFragment(cleanHTML)
  }
  return document.createTextNode(text)
}

// ペーストしたテキストの中から段組みに必要な情報以外は消して追加する
export const paste = (e) => {
  const text = window.clipboardData
    ? window.clipboardData.getData('text')
    : e.clipboardData.getData('text/plain')
  const sel = window.getSelection()
  const range = sel.getRangeAt(0)
  const node = getNode(text)
  range.insertNode(node)

  if (hasBreakLine(text)) {
    // MEMO: 文途中で insert すると後ろのテキストが TextNode になってしまうので
    // <p> で新しく element を作って置き換えてあげる
    range.commonAncestorContainer.childNodes.forEach(node => {
      if (node.nodeType === 3 && node.textContent !== '') {
        const element = document.createElement('p')
        element.innerText = node.textContent
        node.parentNode.replaceChild(element, node)
      }
    })

    const newRange = document.createRange()
    // 文中でペーストしたときに caret の位置をペーストの最後の node にする
    if (range.commonAncestorContainer.childNodes.length !== text.split('\n').length + 1) {
      const { node, offset } = getRangeAndOffsetInTheText(range)
      newRange.setStart(node, offset)
    } else {
      const { node, offset } = getRangeAndOffsetAtBottom(range)
      newRange.setStart(node, offset)
    }
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
  } else {
    range.setStartAfter(node)
    range.setEndAfter(node)
    sel.removeAllRanges()
    sel.addRange(range)
  }

}
