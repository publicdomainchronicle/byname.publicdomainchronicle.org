var http = require('http')
var makeValidPublication = require('./make-valid-publication')
var runSeries = require('run-series')
var server = require('./server')
var tape = require('tape')

tape('GET /publication/{nonexistent}', function (test) {
  server(function (port, done) {
    http.get({
      path: '/publications/nonexistent',
      port: port,
      headers: {
        accept: 'application/json'
      }
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

tape('GET /publication/{created}', function (test) {
  server(function (port, done) {
    var location
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
          path: location,
          port: port,
          headers: {accept: 'application/json'}
        }, function (response) {
          test.equal(
            response.statusCode, 200,
            'responds 200'
          )
          done()
        })
      }
    ], function () {
      done()
      test.end()
    })
  })
})
