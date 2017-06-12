var AJV = require('ajv')
var attachmentPath = require('./util/attachment-path')
var crypto = require('crypto')
var ecb = require('ecb')
var encoding = require('./encoding')
var flushWriteStream = require('flush-write-stream')
var fs = require('fs')
var latest = require('./latest')
var mkdirp = require('mkdirp')
var path = require('path')
var pump = require('pump')
var recordDirectoryPath = require('./util/record-directory-path')
var recordPath = require('./util/record-path')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var sodium = require('sodium-prebuilt').api
var stringify = require('json-stable-stringify')
var through2 = require('through2')
var timestampPath = require('./util/timestamp-path')
var uuid = require('uuid/v4')

var publicationSchema = latest(require('./schemas/publication'))
var timestampSchema = latest(require('./schemas/timestamp'))

var validatePublication = new AJV({allErrors: true})
  .compile(publicationSchema)

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
  var validPublication = false
  return flushWriteStream.obj(
    function (object, _, done) {
      if (object.type === 'attachment') {
        writeAttachment(object, done)
      } else {
        writePublication(object, ecb(done, function (digest) {
          validPublication = digest
          done()
        }))
      }
    },
    function (done) {
      if (validPublication) {
        callback(validPublication)
      } else {
        runParallel(
          attachments.map(function (attachment) {
            return function unlinkTemporaryFile (done) {
              fs.unlink(attachment.temporaryFile, function (error) {
                log.error(error)
                done()
              })
            }
          }),
          function () {
            done()
          }
        )
      }
    }
  )

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
    var secretKey = configuration.keypair.secret
    var publicKey = configuration.keypair.public
    var time = new Date().toISOString()
    publication.attachments = attachments
      .map(function (attachment) {
        return attachment.digest
      })
      .sort()
    log.info('publication', publication)
    publication.version = '1.0.0'
    validatePublication(publication)
    var validationErrors = validatePublication.errors
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
        time: time
      }
      var signature = encoding.encode(
        sodium.crypto_sign_detached(
          Buffer.from(stringify(timestamp)),
          secretKey
        )
      )
      runSeries([
        function writeJSONFile (done) {
          fs.writeFile(recordPath(directory, digest), record, done)
        },
        function createDirectory (done) {
          mkdirp(recordDirectoryPath(directory, digest), done)
        },
        function writeTimestampFile (done) {
          fs.writeFile(
            timestampPath(directory, digest, publicKey),
            stringify({
              timestamp: timestamp,
              signature: signature,
              version: timestampSchema.properties.version.constant
            }),
            done
          )
        },
        function writeAttachments (done) {
          if (attachments.length > 0) {
            runParallel(
              attachments.reduce(
                function (tasks, attachment) {
                  var file = attachmentPath(
                    directory, digest, attachment.digest
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
}
