var http = require('http')
var makeValidPublication = require('./make-valid-publication')
var server = require('./server')
var tape = require('tape')

tape('GET /publish', function (test) {
  server(function (port, done) {
    var request = {path: '/publish', port: port}
    http.get(request, function (response) {
      test.equal(
        response.statusCode, 200,
        'responds 200'
      )
      test.equal(
        response.headers['content-type'], 'text/html; charset=UTF-8',
        'Content-Type: text/html; charset=UTF-8'
      )
      done()
      test.end()
    })
  })
})

tape('POST /publish with valid', function (test) {
  server(function (port, done) {
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
          done()
          test.end()
        })
    )
  })
})

tape('DELETE /publish', function (test) {
  server(function (port, done) {
    http.request({
      method: 'DELETE',
      path: '/publish',
      port: port
    })
      .once('response', function (response) {
        test.equal(
          response.statusCode, 405,
          'responds 405'
        )
        done()
        test.end()
      })
      .end()
  })
})

