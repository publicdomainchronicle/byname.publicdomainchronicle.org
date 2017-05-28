var concat = require('concat-stream')
var http = require('http')
var makeValidPublication = require('./make-valid-publication')
var runSeries = require('run-series')
var server = require('./server')
var sodium = require('sodium-prebuilt').api
var tape = require('tape')

tape('GET /publication/{created}/signature', function (test) {
  server(function (port, done) {
    var location
    var publicKey
    var signature
    var record
    runSeries([
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
          path: location,
          port: port
        }, function (response) {
          response.pipe(concat(function (body) {
            record = body
            done()
          }))
        })
      },
      function (done) {
        http.get({
          path: location + '/signature',
          port: port
        }, function (response) {
          test.equal(
            response.statusCode, 200,
            'responds 200'
          )
          response.pipe(concat(function (body) {
            signature = Buffer.from(body.toString(), 'hex')
            done()
          }))
        })
      }
    ], function () {
      test.assert(
        sodium.crypto_sign_verify_detached(
          signature, record, publicKey
        ),
        'verifiable signature'
      )
      done()
      test.end()
    })
  })
})

tape('GET /publication/{nonexistent}/signature', function (test) {
  server(function (port, done) {
    http.get({
      path: '/publications/nonexistent/signature',
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

tape('NOT-GET /publication/{nonexistent}/signature', function (test) {
  server(function (port, done) {
    http.get({
      method: 'DELETE',
      path: '/publications/nonexistent/signature',
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
