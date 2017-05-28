var Negotiator = require('negotiator')
var fs = require('fs')
var methodNotAllowed = require('./method-not-allowed')
var path = require('path')
var pump = require('pump')
var split2 = require('split2')
var through2 = require('through2')
var trumpet = require('trumpet')

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'publications.html'
)

module.exports = function (request, response, directory) {
  if (request.method === 'GET') {
    var type = new Negotiator(request).mediaType([
      'text/csv', 'text/html'
    ])
    if (!type) {
      response.statusCode = 415
      response.end()
    } else {
      var accessions = path.join(directory, 'accessions')
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
        pump(
          fs.createReadStream(accessions),
          split2(),
          through2.obj(function (line, _, done) {
            var split = line.split(',')
            var date = new Date(parseInt(split[0]))
            this.push(`
              <li>
                <span class=date>${date.toISOString()}</span>:
                <a href=/publications/${split[1]}>
                  ${split[1]}
                </a>
              </li>
            `)
            done()
          }),
          html.select('#publications').createWriteStream()
        )
      }
    }
  } else {
    methodNotAllowed(response)
  }
}
