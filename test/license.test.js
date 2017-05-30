var http = require('http')
var server = require('./server')
var tape = require('tape')

tape('GET /license', function (test) {
  server(function (port, done) {
    var request = {path: '/license', port: port}
    http.get(request, function (response) {
      test.equal(
        response.statusCode, 200,
        'responds 200'
      )
      test.equal(
        response.headers['content-type'], 'text/plain; charset=UTF-8',
        'Content-Type: text/plain; charset=UTF-8'
      )
      done()
      test.end()
    })
  })
})
