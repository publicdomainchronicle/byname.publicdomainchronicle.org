module.exports = function (digest) {
  return digest
    .match(/.{1,32}/g)
    .join('<wbr>')
}
