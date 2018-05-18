export function formatXml(xml) {
  let formatted = ''
  const reg = /(>)(<)(\/*)/g
  xml = xml.replace(reg, '$1\r\n$2$3')
  let pad = 0
  xml.split('\r\n').forEach(function (node) {
    let indent = 0
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0
    } else if (node.match(/^<\/\w/)) {
      if (pad != 0) {
        pad -= 1
      }
    } else if (node.match(/^<\w[^>]*[^/]>.*$/)) {
      indent = 1
    } else {
      indent = 0
    }

    formatted += createPadding(pad) + node + '\r\n'
    pad += indent
  })

  return formatted
}

let padding //babili :(
function createPadding(pad) {
  padding = ''
  for (let i = 0; i < pad; i++) {
    padding += '  '
  }
  return padding
}