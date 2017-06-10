var AJV = require('ajv')
var crypto = require('crypto')
var ecb = require('ecb')
var encoding = require('./encoding')
var flushWriteStream = require('flush-write-stream')
var fs = require('fs')
var mkdirp = require('mkdirp')
var path = require('path')
var pump = require('pump')
var readKeypair = require('./keypair/read')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var schema = require('./schemas/publication')
var sodium = require('sodium-prebuilt').api
var stringify = require('json-stable-stringify')
var through2 = require('through2')
var uuid = require('uuid/v4')

var validate = new AJV({allErrors: true}).compile(schema)

// TODO: Delete attachment files in /tmp for invalid publications.

// Create a writable stream that accepts one or more attachment chunks,
// followed by a publication chunk, and writes files and a signed
// timestamp to the data directory.
//
// Attachment chunks look like:
//
//     {
//       type: 'attachment',
//       stream: Readable,
//       filename: String,
//       encoding: String,
//       mimetype: String
//     }
//
// Publication fields contain JSON data.
module.exports = function (configuration, log, callback) {
  var directory = configuration.directory
  var attachments = []
  return flushWriteStream.obj(function (object, _, done) {
    if (object.type === 'attachment') {
      writeAttachment(object, done)
    } else {
      writePublication(object, ecb(done, function (digest) {
        done()
        callback(digest)
      }))
    }
  })

  function writeAttachment (object, callback) {
    // Save to ./tmp/{UUID}.
    var id = uuid()
    var temporaryFile = path.join(directory, 'tmp', id)
    var attachment = {
      stream: object.stream,
      temporaryFile: temporaryFile,
      type: object.mimetype + '; charset=' + object.encoding
    }
    log.info('attachment', {
      uuid: id,
      filename: object.filename,
      encoding: object.encoding,
      mimetype: object.mimetype
    })
    attachments.push(attachment)
    var hash = crypto.createHash('sha256')
    var size = 0
    pump(
      object.stream,
      // Compute SHA256 as we write to disk.
      through2(function (chunk, chunkEncoding, done) {
        size += chunk.length
        hash.update(chunk, chunkEncoding)
        this.push(chunk, chunkEncoding)
        done()
      }),
      fs.createWriteStream(temporaryFile),
      function (error) {
        /* istanbul ignore next */
        if (error) {
          callback(error)
        } else {
          if (size === 0) {
            var index = attachments.indexOf(attachment)
            attachments.splice(index, 1)
          } else {
            attachment.digest = encoding.encode(hash.digest())
          }
          callback()
        }
      }
    )
  }

  function writePublication (publication, callback) {
    readKeypair(directory, function (error, keypair) {
      /* istanbul ignore if */
      if (error) {
        error.statusCode = 500
        callback(error)
      } else {
        var secretKey = keypair.secret
        var publicKey = keypair.public
        var time = new Date().toISOString()
        publication.attachments = attachments
          .map(function (attachment) {
            return attachment.digest
          })
          .sort()
        log.info('publication', publication)
        validate(publication)
        var validationErrors = validate.errors
        if (validationErrors) {
          log.info('validationErrors', validationErrors)
          var validationError = new Error('Invalid input')
          validationError.validationErrors = validationErrors
          callback(validationError)
        } else {
          var record = Buffer.from(stringify(publication), 'utf8')
          var digest = encoding.encode(
            sodium.crypto_hash_sha256(record)
          )
          var uri = (
            'https://' + configuration.hostname +
            '/publications/' + digest
          )
          var timestamp = {
            digest: digest,
            uri: uri,
            timestamp: time
          }
          var signature = encoding.encode(
            sodium.crypto_sign_detached(
              Buffer.from(stringify(timestamp)),
              secretKey
            )
          )
          var pathPrefix = path.join(
            directory, 'publications', digest
          )
          runSeries([
            function writeJSONFile (done) {
              fs.writeFile(pathPrefix + '.json', record, done)
            },
            function createDirectory (done) {
              mkdirp(pathPrefix, done)
            },
            function writeTimestampFile (done) {
              fs.writeFile(
                path.join(
                  pathPrefix,
                  encoding.encode(publicKey) + '.json'
                ),
                stringify({
                  timestamp: timestamp,
                  signature: signature
                }),
                done
              )
            },
            function writeAttachments (done) {
              if (attachments.length > 0) {
                runParallel(
                  attachments.reduce(
                    function (tasks, attachment) {
                      var file = path.join(
                        directory, 'publications', digest,
                        attachment.digest
                      )
                      return tasks.concat([
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
                      ])
                    },
                    []
                  ),
                  done
                )
              } else {
                done()
              }
            },
            function appendToAccessions (done) {
              fs.appendFile(
                path.join(directory, 'accessions'),
                time + ',' + digest + '\n',
                done
              )
            }
          ], function (error) {
            /* istanbul ignore if */
            if (error) {
              error.statusCode = 500
              callback(error)
            } else {
              callback(null, digest)
            }
          })
        }
      }
    })
  }
}
