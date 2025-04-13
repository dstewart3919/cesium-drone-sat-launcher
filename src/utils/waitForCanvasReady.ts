const waitForCanvasReady = (el: HTMLElement | null): Promise<void> => {
  return new Promise(resolve => {
    const check = () => {
      if (el && el.clientWidth > 0 && el.clientHeight > 0) {
        resolve()
      } else {
        requestAnimationFrame(check)
      }
    }
    check()
  })
}

export default waitForCanvasReady
