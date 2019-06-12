export const indexedHTML = content => {
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
}

export const cleanHTML = nodes => {
  return [...nodes]
    .map(e => {
      if (e.hasAttribute('data-key')) {
        e.removeAttribute('data-key')
      }
      ;[...e.childNodes].map(e => {
        if (e.nodeType === 1 && e.hasAttribute('data-key')) {
          e.removeAttribute('data-key')
        }
      })
      return e.outerHTML
    })
    .join('')
    .replace('&#8203;', '')
}

export const normalizeHTML = nodes => {
  // TODO: もし <p></p> の中に入れ子の HTML 構造ができた場合は、判定して再起させる必要がある
  nodes.forEach(e => {
    e.normalize()
  })
}

export const extractText = content => {
  const div = document.createElement('div')
  div.innerHTML = content
  return div.innerText
}
