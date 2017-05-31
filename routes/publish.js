var Busboy = require('busboy')
var FormData = require('form-data')
var concat = require('concat-stream')
var crypto = require('crypto')
var ecb = require('ecb')
var fs = require('fs')
var https = require('https')
var methodNotAllowed = require('./method-not-allowed')
var mkdirp = require('mkdirp')
var mustache = require('mustache')
var parse = require('json-parse-errback')
var path = require('path')
var pump = require('pump')
var readKeypair = require('../read-keypair')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var sodium = require('sodium-prebuilt').api
var stringify = require('json-stable-stringify')
var through2 = require('through2')
var uuid = require('uuid/v4')

var JOURNALS = require('pct-minimum-documentation')
  .map(function (element) {
    return element.B
  })
  .sort()

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'publish.html'
)

var get = function (request, response, configuration) {
  response.setHeader('Content-Type', 'text/html; charset=UTF-8')
  fs.readFile(TEMPLATE, 'utf8', function (error, template) {
    /* istanbul ignore if */
    if (error) {
      response.statusCode = 500
      response.end()
    } else {
      response.end(
        mustache.render(template, {
          journals: JOURNALS,
          RECAPTCHA_PUBLIC: configuration.recaptcha.public
        })
      )
    }
  })
}

// TODO:  Refactor.
function post (request, response, configuration) {
  var directory = configuration.directory
  var fields = {}
  var parser
  /* istanbul ignore next */
  try {
    // TODO:  Give busboy file count and size limits.
    parser = new Busboy({headers: request.headers})
  } catch (error) {
    response.statusCode = 400
    response.end()
    return
  }
  var attachments = [/* {stream, temporaryFile, digest}, ... */]
  request.pipe(
    parser
      .on('field', function (field, value) {
        if (field.endsWith('[]')) {
          field = field.substring(0, field.length - 2)
          if (fields[field] && Array.isArray(fields[field])) {
            fields[field].push(value)
          } else {
            fields[field] = [value]
          }
        } else {
          fields[field] = value
        }
      })
      .on('file', function (field, file, filename, encoding, mimetype) {
        // Save to ./tmp/{UUID}.
        var temporaryFile = path.join(directory, 'tmp', uuid())
        var attachment = {
          stream: file,
          temporaryFile: temporaryFile,
          type: (
            mimetype + '; charset=' + encoding
          )
        }
        attachments.push(attachment)
        var hash = crypto.createHash('sha256')
        pump(
          file,
          // Compute SHA256 as we write to disk.
          through2(function (chunk, encoding, done) {
            hash.update(chunk, encoding)
            this.push(chunk, encoding)
            done()
          }),
          fs.createWriteStream(temporaryFile),
          function (error, done) {
            // TODO:  Fix this error handler.  Need more cleanup.
            /* istanbul ignore next */
            if (error) {
              response.statusCode = 400
              response.end()
            } else {
              attachment.digest = hash.digest('hex')
            }
          }
        )
      })
      .once('finish', function () {
        var captchaResponse = fields['g-recaptcha-response']
        delete fields['g-recaptcha-response']
        verifyCatpcha(
          captchaResponse, configuration.recaptcha.secret,
          function (error, success) {
            if (error) {
              response.statusCode = 500
              response.end()
            } else if (success === false) {
              response.statusCode = 400
              response.end('invalid captcha')
            } else {
              readKeypair(directory, function (error, keypair) {
                /* istanbul ignore if */
                if (error) {
                  response.statusCode = 500
                  response.end()
                } else {
                  var secretKey = keypair.secret
                  fields.date = currentDate()
                  fields.attachments = attachments
                    .map(function (attachment) {
                      return {
                        type: attachment.type,
                        digest: attachment.digest
                      }
                    })
                    .sort()
                  var record = Buffer.from(stringify(fields), 'utf8')
                  var digest = sodium
                    .crypto_hash_sha256(record)
                    .toString('hex')
                  var signature = sodium
                    .crypto_sign_detached(record, secretKey)
                    .toString('hex')
                  var pathPrefix = path.join(
                    directory, 'publications', digest
                  )
                  runSeries([
                    function writeJSONFile (done) {
                      fs.writeFile(pathPrefix + '.json', record, done)
                    },
                    function writeSignatureFile (done) {
                      fs.writeFile(pathPrefix + '.sig', signature, done)
                    },
                    function writeAttachments (done) {
                      if (attachments.length > 0) {
                        mkdirp(pathPrefix, ecb(done, function () {
                          runParallel(
                            attachments.reduce(
                              function (tasks, attachment) {
                                var file = path.join(
                                  pathPrefix, attachment.digest
                                )
                                return tasks.concat(
                                  function writeTypeFile (done) {
                                    fs.writeFile(
                                      file + '.type',
                                      attachment.type,
                                      'utf8',
                                      done
                                    )
                                  },
                                  function moveFile (done) {
                                    fs.rename(
                                      attachment.temporaryFile, file,
                                      done
                                    )
                                  }
                                )
                              },
                              []
                            ),
                            done
                          )
                        }))
                      } else {
                        done()
                      }
                    },
                    function appendToAccessions (done) {
                      fs.appendFile(
                        path.join(directory, 'accessions'),
                        fields.date + ',' + digest + '\n',
                        done
                      )
                    }
                  ], function (error) {
                    /* istanbul ignore if */
                    if (error) {
                      response.log.error(error)
                      response.statusCode = 500
                      response.end()
                    } else {
                      var location = '/publications/' + digest
                      response.statusCode = 201
                      response.setHeader(
                        'Content-Type', 'text/html; charset=UTF-8'
                      )
                      response.setHeader('Location', location)
                      response.end(redirectTo(location))
                    }
                  })
                }
              })
            }
          }
        )
      })
  )
}

function verifyCatpcha (response, secret, callback) {
  if (process.env.NODE_ENV === 'test') {
    process.nextTick(function () {
      callback(null, true)
    })
  } else if (typeof response === 'string') {
    var form = new FormData()
    form.append('response', response)
    form.append('secret', secret)
    form.pipe(
      https.request({
        method: 'POST',
        host: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        headers: form.getHeaders()
      }, function (response) {
        response.pipe(concat(function (body) {
          parse(body, ecb(callback, function (data) {
            callback(null, data.success)
          }))
        }))
      })
    )
  } else {
    process.nextTick(function () {
      callback(null, false)
    })
  }
}

function currentDate () {
  return new Date()
    .toISOString()
    .substring(0, 10)
}

module.exports = function (request, response, configuration) {
  var method = request.method
  if (method === 'GET') {
    get(request, response, configuration)
  } else if (request.method === 'POST') {
    post(request, response, configuration)
  } else {
    methodNotAllowed(response)
  }
}

function redirectTo (location) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Redirecting&hellip;</title>
        <meta http-equiv=refresh content="0;URL='${location}'">
      </head>
      <body>
        <p>
          Redirecting to <a href=${location}>${location}</a>&hellip;
        </p>
      </body>
    </html>
  `
}
