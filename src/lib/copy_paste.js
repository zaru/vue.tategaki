const hasBreakLine = text => {
  return text.includes('\n')
}

const getNode = text => {
  if (hasBreakLine(text)) {
    const textList = text.split('\n')
    const cleanHTMLs = [
      textList.shift(),
      ...textList.map(line => {
        return line ? `<p>${line}</p>` : `<p><br></p>`
      })
    ]
    return cleanHTMLs.join('')
  }
  return text
}

// ペーストしたテキストの中から段組みに必要な情報以外は消して追加する
export const paste = e => {
  const text = window.clipboardData
    ? window.clipboardData.getData('text')
    : e.clipboardData.getData('text/plain')

  document.execCommand('insertHTML', false, getNode(text))
}
