var http = require('http')
var server = require('./server')
var tape = require('tape')

tape('GET /declaration TEXT', function (test) {
  server(function (port, done) {
    var request = {
      path: '/declaration',
      port: port,
      headers: {
        accept: 'text/plain'
      }
    }
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

tape('GET /declaration JSON', function (test) {
  server(function (port, done) {
    var request = {
      path: '/declaration',
      port: port,
      headers: {
        accept: 'application/json'
      }
    }
    http.get(request, function (response) {
      test.equal(
        response.statusCode, 200,
        'responds 200'
      )
      test.equal(
        response.headers['content-type'], 'application/json',
        'Content-Type: application/json'
      )
      done()
      test.end()
    })
  })
})

tape('GET /declaration HTML', function (test) {
  server(function (port, done) {
    var request = {
      path: '/declaration',
      port: port,
      headers: {
        accept: 'text/html'
      }
    }
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

tape('GET /declaration XML', function (test) {
  server(function (port, done) {
    var request = {
      path: '/declaration',
      port: port,
      headers: {
        accept: 'application/xml'
      }
    }
    http.get(request, function (response) {
      test.equal(
        response.statusCode, 415,
        'responds 415'
      )
      done()
      test.end()
    })
  })
})

tape('DELETE /declaration', function (test) {
  server(function (port, done) {
    var request = {
      method: 'DELETE',
      path: '/declaration',
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
