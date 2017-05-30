var concat = require('concat-stream')
var http = require('http')
var makeValidPublication = require('./make-valid-publication')
var runSeries = require('run-series')
var server = require('./server')
var tape = require('tape')

tape('GET /accessions/{out-of-bounds}', function (test) {
  server(function (port, done) {
    http.get({
      path: '/accessions/100',
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

tape('GET /accessions/{created}', function (test) {
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
          headers: {accept: 'text/html'}
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

tape('GET /publications CSV', function (test) {
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
          path: '/publications/',
          port: port,
          headers: {accept: 'text/csv'}
        }, function (response) {
          test.equal(
            response.statusCode, 200,
            'responds 200'
          )
          response.pipe(concat(function (body) {
            var digest = location.replace('/publications/', '')
            test.assert(
              body.toString().indexOf(digest) !== -1,
              'body contains digest'
            )
            done()
          }))
        })
      }
    ], function () {
      done()
      test.end()
    })
  })
})

tape('GET /publications HTML', function (test) {
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
          path: '/publications/',
          port: port,
          headers: {accept: 'text/html'}
        }, function (response) {
          test.equal(
            response.statusCode, 200,
            'responds 200'
          )
          response.pipe(concat(function (body) {
            test.assert(
              body.toString().indexOf('href=' + location) !== -1,
              'body contains link to publication'
            )
            done()
          }))
        })
      }
    ], function () {
      done()
      test.end()
    })
  })
})

tape('GET /publications XML', function (test) {
  server(function (port, done) {
    var request = {
      path: '/publications',
      port: port,
      headers: {accept: 'application/xml'}
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

tape('GET /accessions/{number}', function (test) {
  server(function (port, done) {
    var locations = []
    runSeries([
      publish.bind(this, 'First'),
      publish.bind(this, 'Second'),
      function (done) {
        http.get({
          path: '/accessions/2',
          port: port
        }, function (response) {
          test.equal(
            response.statusCode, 303,
            'responds 303'
          )
          test.equal(
            response.headers.location, locations[1],
            'sets Location'
          )
          done()
        })
      }
    ], function () {
      done()
      test.end()
    })
    function publish (title, done) {
      var form = makeValidPublication(title)
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
            locations.push(response.headers.location)
            done()
          })
      )
    }
  })
})

tape('NOT-GET /accessions/{number}', function (test) {
  server(function (port, done) {
    http.get({
      method: 'DELETE',
      path: '/accessions/1',
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