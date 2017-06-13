/* Copyright 2017 The BioBricks Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
