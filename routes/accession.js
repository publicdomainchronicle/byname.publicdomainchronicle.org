var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var path = require('path')

var BYTES_PER_LINE = (
  10 + // YYYY-MM-DD
  1 + // space
  64 + // digest
  1 // newline
)

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    var number = parseInt(request.params.number)
    var file = path.join(directory, 'accessions')

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
              response.statusCode = 404
              response.end()
            // Otherwise, read the line for the accession from the file,
            // starting at the calculated offset.
            } else {
              var buffer = Buffer.alloc(BYTES_PER_LINE - 1)
              fs.read(
                fd, buffer, 0, buffer.byteLength, offset,
                function (error) {
                  fs.close(fd)
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
                      'Location', '/publications/' + split[1]
                    )
                    response.end()
                  }
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
