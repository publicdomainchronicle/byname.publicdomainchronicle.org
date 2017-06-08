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

tape('GET /publication/{created}/timestamp', function (test) {
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
          path: location + '/timestamp',
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

tape('GET /publication/{created}/timestamp/{key}', function (test) {
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
          path: location + '/timestamp/' + publicKey,
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

tape('GET /publication/{nonexistent}/timestamp', function (test) {
  server(function (port, done) {
    http.get({
      path: '/publications/nonexistent/timestamp',
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

tape('NOT-GET /publication/{nonexistent}/timestamp', function (test) {
  server(function (port, done) {
    http.get({
      method: 'DELETE',
      path: '/publications/nonexistent/timestamp',
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
