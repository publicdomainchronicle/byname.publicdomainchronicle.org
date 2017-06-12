var AJV = require('ajv')
var concat = require('concat-stream')
var ecb = require('ecb')
var encoding = require('./encoding')
var flushWriteStream = require('flush-write-stream')
var fs = require('fs')
var http = require('http-https')
var parse = require('json-parse-errback')
var path = require('path')
var pump = require('pump')
var pumpify = require('pumpify')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var sodium = require('sodium-prebuilt').api
var split2 = require('split2')
var stringify = require('json-stable-stringify')
var through2 = require('through2')
var url = require('url')
var xtend = require('xtend')

var validate = new AJV({allErrors: true})
  .compile(require('./schemas/publication'))

module.exports = function (configuration, log) {
  var directory = configuration.directory
  readPeers(directory, ecb(logError, function (peers) {
    runParallel(
      peers.map(function (peer) {
        return replicatePeer.bind(null, configuration, peer, log)
      }),
      ecb(logError, function () {
        writePeers(directory, peers, ecb(logError, function () {
          log.info('done')
        }))
      })
    )
  }))

  function logError (error) {
    log.error(error)
  }
}

function replicatePeer (configuration, log, peer) {
  pump(
    createNewPublicationsStream(peer),
    flushWriteStream.obj(function (publication, _, done) {
      replicatePublication(configuration, log, peer, publication, done)
    })
  )
}

/*
getRecord(peer, publication, function (error, record) {
  if (error) {
    log.error(error)
    done()
  } else {
    var time = new Date().toISOString()
    // TODO: Validate publications from peers
    var digest = publication.digest
    runSeries([
      function copyFiles (done) {
        var tasks = record
          .attachments
          .map(function (attachment) {
            return function (done) {
              var file = path.join(
                directory, 'publications',
                digest, attachment
              )
              // Download the attachment file.
              download(
                xtend(peer.url, {
                  path: (
                    peer.url.path +
                    '/publications/' + digest +
                    '/attachments/' + attachment
                  )
                }),
                file,
                // Write Content-Type to .type file.
                ecb(done, function (contentType) {
                  writeIfMissing(
                    file + '.type',
                    contentType,
                    done
                  )
                })
              )
            }
          })
          .concat(function writeRecordJSON (done) {
            writeIfMissing(
              path.join(
                directory, 'publications',
                digest + '.json'
              ),
              stringify(record),
              done
            )
          })
          .concat(function writeTimestamp (done) {
            // TODO: Share logic with route.
            var timestamp = {
              digest: digest,
              uri: (
                'https://' + hostname + '/publications/' + digest
              ),
              timestamp: time
            }
            var signature = encoding.encode(
              sodium.crypto_sign_detached(
                Buffer.from(stringify(timestamp)),
                keypair.secret
              )
            )
            writeIfMissing(
              path.join(
                directory, 'publications',
                encoding.encode(keypair.public) +
                '.json'
              ),
              stringify({
                timestamp: timestamp,
                signature: signature
              }),
              done
            )
          })
          .concat(function downloadTimestamp (done) {
            download(
              xtend(peer.url, {
                path: (
                  peer.url.path +
                  '/publications/' + digest +
                  '/timestamps/' + peer.key
                )
              }),
              path.join(
                directory,
                'publications', digest,
                peer.key + '.json'
              ),
              done
            )
          })
        runParallel(tasks, done)
      },
      function appendToAccessionsLog (done) {
        fs.appendFile(
          path.join(directory, 'accessions'),
          time + ',' + publication.digest + '\n',
          function (error) {
            if (error) {
              log.error(error)
              done()
            } else {
              peer.lastAccessionNumber = publication.accessionNumber
              done()
            }
          }
        )
      }
    ])
    lastAccessionNumber = publication.accessionNumber
  }
})
*/

function replicatePublication (configuration, peer, publication, log, done) {
  var directory = configuration.directory
  var keypair = configuration.keypair
  var hostname = configuration.hostname

  var record
  var peerTimestamp
  runSeries([
    checkConflict,
    runParallel.bind(null, [
      getRecord,
      getTimestamp
    ]),
    validateRecord,
    validateTimestamp,
    runParallel.bind(null, [
      saveOwnTimestamp,
      savePeerTimestamp,
      savePublication,
      getAndSaveAttachments
    ])
  ])

  function checkConflict (done) {
    
  }

  function getRecord (done) {
    pump(
      http.get(xtend(peer.url, {
        path: peer.url.path + '/accessions/' + publication.digest,
        headers: {accept: 'application/json'}
      })),
      concat(function (buffer) {
        parse(buffer, ecb(done, function (parsed) {
          record = parsed
          done()
        }))
      }),
      function (error) {
        if (error) {
          done(error)
        }
      }
    )
  }

  function getTimestamp (done) {
    pump(
      http.get(xtend(peer.url, {
        path: (
          peer.url.path +
          '/accessions/' + publication.digest +
          '/timestamp/' + peer.publicKey
        ),
        headers: {accept: 'application/json'}
      })),
      concat(function (buffer) {
        parse(buffer, ecb(done, function (parsed) {
          peerTimestamp = parsed
          done()
        }))
      }),
      function (error) {
        if (error) {
          done(error)
        }
      }
    )
  }

  function validateRecord (done) {
    validate(record)
    var errors = validate.errors
    if (errors) {
      log.info('validationErrors', errors)
      var error = new Error('invalid record')
      error.validationErrors = errors
      done(error)
    } else {
      done()
    }
  }

  function validateTimestamp (done) {
    done(
      sodium.crypto_sign_verify_detached(
        encoding.decode(peerTimestamp.signature),
        Buffer.from(stringify(peerTimestamp.timestamp)),
        peer.publicKey
      )
        ? new Error('Invalid peer timestamp')
        : null
    )
  }
}

function writeIfMissing (path, data, done) {
  fs.writeFile(path, data, {flag: 'wx'}, function (error) {
    if (error && error.code !== 'EEXIST') {
      done(error)
    } else {
      done()
    }
  })
}

function download (from, to, done) {
  fs.access(to, fs.constants.F_OK, function (error) {
    if (!error) {
      done()
    } else {
      var contentType
      pump(
        http.get(from)
          .once('response', function (response) {
            contentType = response.headers['Content-Type']
          })
        ,
        fs.createWriteStream(to),
        ecb(done, function () {
          done(null, contentType)
        })
      )
    }
  })
}

function getRecord (peer, publication, done) {
}

function getTimestamp (peer, publication, done) {
}

function readPeers (directory, callback) {
  var file = path.join(directory, 'peers')
  fs.readFile(file, 'utf8', ecb(callback, function (string) {
    var peers = string
      .split('\n')
      .map(function (line) {
        var split = line.split(',')
        return {
          url: url.parse(split[0]),
          publicKey: encoding.decode(split[1]),
          last: parseInt(split[2])
        }
      })
    callback(null, peers)
  }))
}

function writePeers (directory, peers, callback) {
  var file = path.join(directory, 'peers')
  var data = peers
    .map(function (peer) {
      return (
        url.format(peer.url) + ',' +
        peer.lastAccessionNumber.toString()
      )
    })
  fs.writeFile(file, data, callback)
}

function createNewPublicationsStream (peer) {
  var request = xtend(peer.url, {
    path: peer.url.path + '/accessions?from=' + peer.last,
    headers: {accept: 'text/csv'}
  })
  var counter = peer.last
  return pumpify(
    http.get(request),
    split2(),
    through2(function (line, _, done) {
      counter++
      done(null, {
        accessionNumber: counter,
        digest: line.split(',')[1]
      })
    })
  )
}
