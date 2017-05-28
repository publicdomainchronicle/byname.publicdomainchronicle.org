var http = require('http')
var server = require('./server')
var tape = require('tape')

tape('GET /styles.css', function (test) {
  server(function (port, done) {
    var request = {path: '/styles.css', port: port}
    http.get(request, function (response) {
      test.equal(
        response.statusCode, 200,
        'responds 200'
      )
      test.equal(
        response.headers['content-type'], 'text/css; charset=UTF-8',
        'Content-Type: text/css; charset=UTF-8'
      )
      done()
      test.end()
    })
  })
})

tape('NOT-GET /styles.css', function (test) {
  server(function (port, done) {
    var request = {
      method: 'DELETE',
      path: '/styles.css',
      port: port
    }
    http.get(request, function (response) {
      test.equal(
        response.statusCode, 405,
        'responds 405'
      )
      done()
      test.end()
    })
  })
})
