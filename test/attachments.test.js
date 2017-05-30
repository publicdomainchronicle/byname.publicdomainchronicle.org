var concat = require('concat-stream')
var crypto = require('crypto')
var http = require('http')
var makeValidPublication = require('./make-valid-publication')
var runSeries = require('run-series')
var server = require('./server')
var stringToStream = require('string-to-stream')
var tape = require('tape')

tape('GET /publications/{}/attachments/{}', function (test) {
  server(function (port, done) {
    var location
    var content
    var attachmentText = 'This is a test attachment.'
    var digest = crypto
      .createHash('sha256')
      .update(attachmentText)
      .digest('hex')
    runSeries([
      function (done) {
        var form = makeValidPublication()
        form.append('attachments[]',
          stringToStream(attachmentText),
          {
            filename: 'attachment.txt',
            contentType: 'text/plain',
            knownLength: attachmentText.length
          }
        )
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
          path: location + '/attachments/' + digest,
          port: port
        }, function (response) {
          test.equal(
            response.statusCode, 200,
            'responds 200'
          )
          test.assert(
            response.headers['content-type'].includes('text/plain'),
            'Content-Type'
          )
          response.pipe(concat(function (body) {
            content = body.toString()
            done()
          }))
        })
      }
    ], function () {
      test.equal(
        content, attachmentText,
        'serves attachment content'
      )
      done()
      test.end()
    })
  })
})

tape('GET /publications/{}/attachments/{not-digest}', function (test) {
  var a = crypto.createHash('sha256')
    .update('a')
    .digest('hex')
  server(function (port, done) {
    http.get({
      method: 'GET',
      path: '/publications/' + a + '/attachments/blah',
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

tape('NOT-GET /publications/{}/attachments/{}', function (test) {
  var a = crypto.createHash('sha256')
    .update('a')
    .digest('hex')
  var b = crypto.createHash('sha256')
    .update('b')
    .digest('hex')
  server(function (port, done) {
    http.get({
      method: 'DELETE',
      path: '/publications/' + a + '/attachments/' + b,
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
