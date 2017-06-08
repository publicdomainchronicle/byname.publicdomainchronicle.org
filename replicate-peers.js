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
var readKeypair = require('../keypair/read')
var runParallel = require('run-parallel')
var runSeries = require('run-series')
var sodium = require('sodium-prebuilt').api
var split2 = require('split2')
var stringify = require('json-stable-stringify')
var through2 = require('through2')
var url = require('url')
var xtend = require('xtend')

module.exports = function (configuration, log) {
  var directory = configuration.directory
  readKeypair(directory, ecb(logError, function (keypair) {
    readPeers(directory, ecb(logError, function (peers) {
      runParallel(
        peers.map(function (peer) {
          return function (done) {
            getPublicKey(peer, keypair, ecb(logError, function (key) {
              peer.key = key
              pump(
                createNewPublicationsStream(peer),
                flushWriteStream.obj(function (publication, _, done) {
                  getJSON(peer, publication, function (error, record) {
                    if (error) {
                      logError(error)
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
                                  'https://' + configuration.hostname +
                                  '/publications/' + digest
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
                                logError(error)
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
                })
              )
            }))
          }
        }),
        function () {
          writePeers(directory, peers, ecb(logError, function () {
            log.info('done')
          }))
        }
      )
    }))
  }))

  function logError (error) {
    if (error) {
      log.error(error)
    }
  }
}

function writeIfMissing (path, data, done) {
  fs.access(to, fs.constants.F_OK, function (error) {
    if (!error) {
      done()
    } else {
      fs.writeFile(path, data, done)
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

function getJSON (peer, publication, done) {
  pump(
    http.get(xtend(peer.url, {
      path: peer.url.path + '/accessions/' + publication.digest,
      headers: {accept: 'application/json'}
    })),
    concat(function (buffer) {
      parse(buffer, done)
    }),
    function (error) {
      if (error) {
        done(error)
      }
    }
  )
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
          last: parseInt(split[1])
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

function getPublicKey (peer, ourKeyPair, callback) {
  pump(
    http.get(xtend(peer.url, {
      path: peer.url.path + '/key'
    })),
    concat(function (buffer) {
      // TODO: Validate peer public key.
      var string = buffer.toString()
      if (string === encoding.encode(ourKeyPair.public)) {
        callback(new Error('Peer served our own public key'))
      } else {
        callback(null, buffer.toString())
      }
    }),
    function (error) {
      if (error) {
        callback(error)
      }
    }
  )
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
