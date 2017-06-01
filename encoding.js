function encode (buffer) {
  return buffer.toString('hex')
}

function decode (string) {
  return Buffer.from(string, 'hex')
}

var digestPattern = '^[a-f0-9]{64}$'

var digestRE = new RegExp(digestPattern)

function isDigest (string) {
  return digestRE.test(string)
}

var signaturePattern = '^[a-f0-9]{128}$'

var signatureRE = new RegExp(signaturePattern)

function isSignature (string) {
  return signatureRE.test(string)
}

function format (digest) {
  return digest
    .match(/.{1,32}/g)
    .join('<wbr>')
}

module.exports = {
  encode: encode,
  decode: decode,
  digestPattern: digestPattern,
  isDigest: isDigest,
  signaturePattern: signaturePattern,
  isSignature: isSignature,
  format: format
}
