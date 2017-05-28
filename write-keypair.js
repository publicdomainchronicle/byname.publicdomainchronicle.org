var fs = require('fs')
var path = require('path')
var sodium = require('sodium-prebuilt').api

module.exports = function (directory, callback) {
  var keypair = sodium.crypto_sign_keypair()
  var file = path.join(directory, 'keys')
  var json = JSON.stringify({
    public: keypair.publicKey.toString('hex'),
    secret: keypair.secretKey.toString('hex')
  })
  fs.writeFile(file, json, callback)
}
