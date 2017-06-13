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

var concat = require('concat-stream')
var ecb = require('ecb')
var http = require('http')
var makeValidPublication = require('./make-valid-publication')
var parse = require('json-parse-errback')
var runSeries = require('run-series')
var server = require('./server')
var sodium = require('sodium-prebuilt').api
var stringify = require('json-stable-stringify')
var tape = require('tape')

tape('GET /publication/{created}/timestamps/{key}', function (test) {
  server(function (port, done) {
    var location
    var publicKey
    var timestamp
    runSeries([
      function (done) {
        var form = makeValidPublication()
        form.pipe(
          http.request({
            method: 'POST',
            path: '/publish',
            port: port,
            headers: form.getHeaders()
          })
            .once('response', function (response) {
              test.equal(
                response.statusCode, 201,
                'responds 201'
              )
              test.assert(
                response.headers.location.startsWith('/publications/'),
                'sets Location'
              )
              location = response.headers.location
              done()
            })
        )
      },
      function (done) {
        http.get({
          path: '/key',
          port: port
        }, function (response) {
          response.pipe(concat(function (body) {
            publicKey = Buffer.from(body.toString(), 'hex')
            done()
          }))
        })
      },
      function (done) {
        http.get({
          path: location + '/timestamps/' + publicKey.toString('hex'),
          port: port
        }, function (response) {
          test.equal(
            response.statusCode, 200,
            'responds 200'
          )
          response.pipe(concat(function (body) {
            parse(body, ecb(done, function (data) {
              timestamp = data
              done()
            }))
          }))
        })
      }
    ], function () {
      var signature = Buffer.from(timestamp.signature, 'hex')
      test.assert(
        timestamp.hasOwnProperty('version'),
        'has version'
      )
      test.assert(
        location.endsWith(timestamp.timestamp.digest),
        'digests match'
      )
      test.assert(
        sodium.crypto_sign_verify_detached(
          signature,
          Buffer.from(stringify(timestamp.timestamp)),
          publicKey
        ),
        'verifiable signature'
      )
      done()
      test.end()
    })
  })
})

tape('GET /publication/{nonexistent}/timestamps/{publicKey}', function (test) {
  server(function (port, done) {
    http.get({
      path: '/publications/nonexistent/timestamps/x',
      port: port
    }, function (response) {
      test.equal(
        response.statusCode, 404,
        'responds 404'
      )
      done()
      test.end()
    })
  })
})

tape('NOT-GET /publication/{nonexistent}/timestamps/{publicKey}', function (test) {
  server(function (port, done) {
    http.get({
      method: 'DELETE',
      path: '/publications/nonexistent/timestamps/x',
      port: port
    }, function (response) {
      test.equal(
        response.statusCode, 405,
        'responds 405'
      )
      done()
      test.end()
    })
  })
})
