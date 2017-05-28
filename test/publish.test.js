var http = require('http')
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
