var Negotiator = require('negotiator')
var formatDate = require('../format-date')
var formatHex = require('../format-hex')
var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var path = require('path')
var pump = require('pump')
var split2 = require('split2')
var through2 = require('through2')
var trumpet = require('trumpet')

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'accessions.html'
)

module.exports = function (request, response, configuration) {
  if (request.method === 'GET') {
    var type = new Negotiator(request).mediaType([
      'text/csv', 'text/html'
    ])
    if (!type) {
      response.statusCode = 415
      response.end()
    } else {
      var accessions = path.join(configuration.directory, 'accessions')
      /* istanbul ignore else */
      if (type === 'text/csv') {
        response.setHeader('Content-Type', 'text/csv; charset=ASCII')
        fs.createReadStream(accessions)
          .once('error', /* istanbul ignore next */ function (error) {
            request.log.error(error)
            response.statusCode = 500
            response.end()
          })
          .pipe(response)
      } else if (type === 'text/html') {
        response.setHeader('Content-Type', 'text/html; charset=UTF-8')
        var html = trumpet()
        pump(html, response)
        pump(fs.createReadStream(TEMPLATE), html)
        var counter = 0
        pump(
          fs.createReadStream(accessions),
          split2(),
          through2.obj(function (line, _, done) {
            var split = line.split(',')
            var timestamp = formatDate(new Date(split[0]))
            this.push(`
              <tr>
                <td>${++counter}</td>
                <td>${timestamp}</td>
                <td>
                  <a href=/publications/${split[1]}>
                    <code>${formatHex(split[1])}</code>
                  </a>
                </td>
              </tr>
            `)
            done()
          }),
          html.select('tbody').createWriteStream()
        )
      }
    }
  } else {
    methodNotAllowed(response)
  }
}
