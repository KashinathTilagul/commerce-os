(() => {
  if (location.pathname.startsWith('/workforce')) history.replaceState(null, '', '/')
  document.title = 'Ekvaar OS'

  const applyBrand = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (node.nodeValue?.includes('Rakazo')) {
        node.nodeValue = node.nodeValue.replaceAll('Rakazo', 'Ekvaar OS')
      }
    }
  }

  document.addEventListener('click', (event) => {
    if (window.parent === window) return
    const target = event.target instanceof Element ? event.target.closest('button') : null
    if (target?.textContent?.trim() !== 'Integrations') return

    event.preventDefault()
    event.stopImmediatePropagation()
    window.parent.postMessage(
      { source: 'ekvaar-workforce', type: 'ekvaar:open-app', appId: 'integrations' },
      location.origin,
    )
  }, true)

  addEventListener('DOMContentLoaded', () => {
    applyBrand()
    new MutationObserver(applyBrand).observe(document.body, { childList: true, subtree: true })
  })
})()
