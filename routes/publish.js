var Busboy = require('busboy')
var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var path = require('path')
var readKeypair = require('../read-keypair')
var runSeries = require('run-series')
var serveFile = require('./serve-file')
var sodium = require('sodium-prebuilt').api
var stringify = require('json-stable-stringify')

var get = serveFile('publish.html')

function post (request, response, directory) {
  readPostBody(request, function (error, fields) {
    /* istanbul ignore if */
    if (error) {
      request.log.error(error)
      response.statusCode = 500
      response.end()
    } else {
      request.log.info({
        event: 'parsed fields'
      })
      readKeypair(directory, function (error, keypair) {
        /* istanbul ignore if */
        if (error) {
          response.statusCode = 500
          response.end()
        } else {
          var secretKey = keypair.secret
          fields.time = currentTime()
          var record = Buffer.from(stringify(fields), 'utf8')
          var digest = sodium.crypto_hash_sha256(record).toString('hex')
          var signature = sodium.crypto_sign_detached(record, secretKey)
            .toString('hex')
          var pathPrefix = path.join(directory, 'publications', digest)
          runSeries([
            function (done) {
              fs.writeFile(pathPrefix + '.json', record, done)
            },
            function (done) {
              fs.writeFile(pathPrefix + '.sig', signature, done)
            }
          ], function (error) {
            /* istanbul ignore if */
            if (error) {
              response.log.error(error)
              response.statusCode = 500
              response.end()
            } else {
              response.statusCode = 201
              response.setHeader('Location', '/publications/' + digest)
              response.end()
            }
          })
        }
      })
    }
  })
}

function readPostBody (request, callback) {
  var fields = {}
  var parser
  /* istanbul ignore next */
  try {
    parser = new Busboy({headers: request.headers})
  } catch (error) {
    callback(error)
    return
  }
  request.pipe(
    parser
      .on('field', function (field, value) {
        fields[field] = value
      })
      .once('finish', function () {
        callback(null, fields)
      })
  )
}

function currentTime () {
  return new Date()
    .getTime()
    .toString()
}

module.exports = function (request, response, directory) {
  var method = request.method
  if (method === 'GET') {
    get(request, response)
  } else if (request.method === 'POST') {
    post(request, response, directory)
  } else {
    methodNotAllowed(response)
  }
}
