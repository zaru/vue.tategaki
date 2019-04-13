class StackBuffer {
  constructor() {
    this.buffer = []
    this.max_size = 100
  }

  set stack(val) {
    this.buffer.push(val)
    if (this.buffer.length > this.max_size) {
      this.buffer.shift()
    }
  }

  get current() {
    if (this.buffer.length < 1) {
      return false
    }
    return this.buffer.pop()
  }

  get all_buffer() {
    return this.buffer
  }
}

export default StackBuffer
