/*
Copyright 2017 The BioBricks Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var notFound = require('./not-found')
var path = require('path')

var BYTES_PER_LINE = require('../bytes-per-accession')

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var number = parseInt(request.params.number)
    var file = path.join(configuration.directory, 'accessions')

    // Get a file descriptor.
    fs.open(file, 'r', function (error, fd) {
      /* istanbul ignore if */
      if (error) {
        request.log.error(error)
        response.statusCode = 500
        response.end()
      } else {
        // Calculate the offset where the requested accession's line
        // begins, if we have it.
        var offset = BYTES_PER_LINE * (number - 1)
        // Stat the file and compare its size to the offset for the
        // accession number requested.
        fs.fstat(fd, function (error, stats) {
          /* istanbul ignore if */
          if (error) {
            request.log.error(error)
            response.statusCode = 500
            response.end()
            fs.close(fd)
          } else {
            // If the accessions file is too small to have the requested
            // accession number, respond 404.
            if (stats.size < (offset + BYTES_PER_LINE)) {
              notFound(request, response, configuration)
            // Otherwise, read the line for the accession from the file,
            // starting at the calculated offset.
            } else {
              var buffer = Buffer.alloc(BYTES_PER_LINE - 1)
              fs.read(
                fd, buffer, 0, buffer.byteLength, offset,
                function (error) {
                  /* istanbul ignore if */
                  if (error) {
                    request.log.error(error)
                    response.statusCode = 500
                    response.end()
                  } else {
                    // Redirect the client to the publication path.
                    var split = buffer
                      .toString()
                      .split(',')
                    response.statusCode = 303
                    response.setHeader(
                      'Location', configuration.base + 'publications/' + split[1]
                    )
                    response.end()
                  }
                  fs.close(fd, function () {
                    // pass
                  })
                }
              )
            }
          }
        })
      }
    })
  } else {
    methodNotAllowed(response)
  }
}
