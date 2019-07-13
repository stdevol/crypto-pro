export function readFileToBase64String(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = function() {
        resolve(fileReader.result.split(';base64,').pop()) //remove url data ";base64,"
      }
      fileReader.onerror = function() {
        reject('Error in FileReader')
      }
  
      fileReader.readAsDataURL(file)
    })
  }
  
  export function* partialRead(file) {
    const chunkSize = 3 * 1024 * 1024 // 3MB
    let currentChunk = 0
    const chunks = Math.ceil(file.size / chunkSize)
  
    while (true) {
      yield new Promise((resolve, reject) => {
        const fileReader = new FileReader()
  
        fileReader.onerror = function() {
          reject('Error in FileReader')
        }
  
        fileReader.onload = function({ target }) {
          var base64Data = target.result.split(';base64,').pop()
          resolve(base64Data)
        }
  
        var start = currentChunk * chunkSize
        var end = start + chunkSize >= file.size ? file.size : start + chunkSize
  
        const blob = file.slice(start, end)
        fileReader.readAsDataURL(blob)
        currentChunk++
      })
  
      if (currentChunk >= chunks) {
        break
      }
    }
  }
  