var AJV = require('ajv')
var attachmentPath = require('./util/attachment-path')
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
var readRecord = require('./util/read-record')
var recordPath = require('./util/record-path')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var signaturePath = require('./util/timestamp-path')
var sodium = require('sodium-prebuilt').api
var split2 = require('split2')
var stringify = require('json-stable-stringify')
var through2 = require('through2')
var timestampPath = require('./util/timestamp-path')
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
        if (peers.length === 0) {
          log.info('done')
        } else {
          writePeers(directory, peers, ecb(logError, function () {
            log.info('done')
          }))
        }
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
      republish(configuration, log, peer, publication, done)
    })
  )
}

function republish (configuration, peer, publication, log, done) {
  var haveRecord
  var havePeerTimestamp
  var record
  var peerTimestamp
  var files
  runSeries([
    runParallel.bind(null, [
      checkHaveRecord,
      checkHavePeerTimestamp
    ]),
    runParallel.bind(null, [
      getRecord,
      unless(havePeerTimestamp, getPeerTimestamp)
    ]),
    unless(haveRecord, validateRecord),
    unless(havePeerTimestamp, validatePeerTimestamp),
    runParallel.bind(null, [
      unless(haveRecord, saveOwnTimestamp),
      unless(havePeerTimestamp, savePeerTimestamp),
      unless(haveRecord, savePublication),
      unless(haveRecord, getAndSaveAttachments)
    ]),
    bumpAccessionNumber
  ])

  function unless (flag, step) {
    return function (done) {
      if (flag) {
        done()
      } else {
        step(done)
      }
    }
  }

  function checkHaveRecord (done) {
    var file = recordPath(configuration.directory, publication.digest)
    fileExists(file, ecb(done, function (exists) {
      haveRecord = exists
      done()
    }))
  }

  function checkHavePeerTimestamp (done) {
    var file = timestampPath(
      configuration.directory,
      publication.digest,
      peer.publicKey
    )
    fileExists(file, ecb(done, function (exists) {
      havePeerTimestamp = exists
      done()
    }))
  }

  function getRecord (done) {
    if (haveRecord) {
      readRecord(publication.digest, ecb(done, function (parsed) {
        record = parsed
        done()
      }))
    } else {
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
  }

  function getPeerTimestamp (done) {
    pump(
      http.get(xtend(peer.url, {
        path: (
          peer.url.path +
          '/accessions/' + publication.digest +
          '/timestamp/' + encoding.encode(peer.publicKey)
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
      return done(error)
    }
    var computedDigest = encoding.encode(
      sodium.crypto_hash_sha256(
        Buffer.from(stringify(publication), 'utf8')
      )
    )
    if (computedDigest !== publication.digest) {
      done(new Error(
        'reported and computed digests do not match'
      ))
    }
    done()
  }

  function validatePeerTimestamp (done) {
    var digestsMatch = (
      peerTimestamp.timestamp.digest ===
      encoding.encode(
        sodium.crypto_hash_sha256(
          Buffer.from(stringify(publication), 'utf8')
        )
      )
    )
    if (!digestsMatch) {
      return done(new Error(
        'peer timestamp digest does not match record'
      ))
    }
    var validSignature = sodium.crypto_sign_verify_detached(
      encoding.decode(peerTimestamp.signature),
      Buffer.from(stringify(peerTimestamp.timestamp)),
      peer.publicKey
    )
    if (!validSignature) {
      return done(new Error('invalid peer signature'))
    }
    done()
  }

  function saveOwnTimestamp (done) {
    var timestamp = {
      digest: publication,
      uri: (
        'https://' + configuration.hostname +
        '/publications/' + publication.digest
      ),
      timestamp: new Date().toISOString()
    }
    var signature = encoding.encode(
      sodium.crypto_sign_detached(
        Buffer.from(stringify(timestamp)),
        configuration.keypair.secret
      )
    )
    var file = signaturePath(
      configuration.directory,
      publication.digest,
      encoding.encode(configuration.keypair.public)
    )
    files.push(file)
    var data = stringify({
      timestamp: timestamp,
      signature: signature
    })
    fs.writeFile(file, data, 'utf8', done)
  }

  function savePeerTimestamp (done) {
    var file = timestampPath(
      configuration.directory,
      publication.digest,
      peer.publicKey
    )
    files.push(file)
    var data = stringify(peerTimestamp)
    fs.writeFile(file, data, 'utf8', done)
  }

  function savePublication (done) {
    var file = recordPath(configuration.directory, publication.digest)
    files.push(file)
    var data = stringify(record)
    writeIfMissing(file, data, done)
  }

  function getAndSaveAttachments (done) {
    runParallel(
      record.attachments.map(function (attachmentDigest) {
        return function (done) {
          var url = xtend(peer.url, {
            path: (
              peer.url.path +
              '/publications/' + publication.digest +
              '/attachments/' + attachmentDigest
            )
          })
          var file = attachmentPath(
            configuration.directory,
            publication.digest,
            attachmentDigest
          )
          download(url, file, ecb(done, function (contentType) {
            writeIfMissing(file + '.type', contentType, done)
          }))
        }
      })
    )
  }

  function bumpAccessionNumber (done) {
    peer.lastAccessionNumber = publication.accessionNumber
    done()
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
        fs.createWriteStream(to, {flags: 'wx'}),
        ecb(done, function () {
          done(null, contentType)
        })
      )
    }
  })
}

function readPeers (directory, callback) {
  var file = path.join(directory, 'peers')
  fs.readFile(file, 'utf8', function (error, string) {
    if (error) {
      if (error.code === 'ENOENT') {
        callback(null, [])
      } else {
        callback(error)
      }
    } else {
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
    }
  })
}

function writePeers (directory, peers, callback) {
  var file = path.join(directory, 'peers')
  var data = peers
    .map(function (peer) {
      return (
        url.format(peer.url) + ',' +
        encoding.encode(peer.publicKey),
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

function fileExists (path, callback) {
  fs.access(path, fs.constants.R_OK, function (error) {
    if (error) {
      if (error.code === 'ENOENT') {
        callback(null, false)
      } else {
        callback(error)
      }
    } else {
      callback(null, true)
    }
  })
}
