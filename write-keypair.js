var encoding = require('./encoding')
var fs = require('fs')
var path = require('path')
var sodium = require('sodium-prebuilt').api

module.exports = function (directory, callback) {
  var keypair = sodium.crypto_sign_keypair()
  var file = path.join(directory, 'keys')
  var json = JSON.stringify({
    public: encoding.encode(keypair.publicKey),
    secret: encoding.encode(keypair.secretKey)
  })
  fs.writeFile(file, json, callback)
}
