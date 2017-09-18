/*
Copyright 2017 The BioBricks Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

var encoding = require('../encoding')
var fs = require('fs')
var path = require('path')
var sodium = require('sodium-native')

module.exports = function (directory, callback) {
  var keypair = {
    publicKey: Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES),
    secretKey: Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
  }
  sodium.crypto_sign_keypair(keypair.publicKey, keypair.secretKey)
  var file = path.join(directory, 'keys')
  var json = JSON.stringify({
    public: encoding.encode(keypair.publicKey),
    secret: encoding.encode(keypair.secretKey)
  })
  fs.writeFile(file, json, function (error) {
    if (error) {
      callback(error)
    } else {
      callback(null, {
        public: keypair.publicKey,
        secret: keypair.secretKey
      })
    }
  })
}
