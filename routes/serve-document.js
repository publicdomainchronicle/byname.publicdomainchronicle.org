var Negotiator = require('negotiator')
var fs = require('fs')
var latest = require('../latest')
var methodNotAllowed = require('./method-not-allowed')
var mustache = require('mustache')
var parse = require('json-parse-errback')
var path = require('path')
var straightenQuotes = require('straighten-quotes')
var wordwrap = require('wordwrap')

var documents = path.join(__dirname, '..', 'documents')

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'document.html'
)

module.exports = function (name) {
  return function (request, response) {
    if (request.method === 'GET') {
      var type = new Negotiator(request).mediaType([
        'application/json', 'text/plain', 'text/html'
      ])
      if (!type) {
        response.statusCode = 415
        response.end()
      } else {
        var json = path.join(documents, name + '.json')
        fs.readFile(json, 'utf8', function (error, json) {
          /* istanbul ignore if */
          if (error) {
            response.statusCode = 404
            response.end()
          } else {
            parse(json, function (error, data) {
              /* istanbul ignore if */
              if (error) {
                response.statusCode = 500
                response.end()
              } else {
                var requestedVersion = request.query.version
                  ? data[request.query.version]
                  : latest(data)
                if (!requestedVersion) {
                  response.statusCode = 404
                  response.end()
                /* istanbul ignore else */
                } else if (type === 'application/json') {
                  response.setHeader(
                    'Content-Type', 'application/json'
                  )
                  response.end(JSON.stringify(
                    latest(data)
                  ))
                } else if (type === 'text/plain') {
                  response.setHeader(
                    'Content-Type', 'text/plain; charset=UTF-8'
                  )
                  response.end(jsonToTXT(latest(data)))
                } else if (type === 'text/html') {
                  fs.readFile(TEMPLATE, 'utf8', function (error, t) {
                    if (error) {
                      response.statusCode = 500
                      response.end()
                    } else {
                      response.setHeader(
                        'Content-Type',
                        'text/html; charset=UTF-8'
                      )
                      response.end(
                        mustache.render(t, latest(data))
                      )
                    }
                  })
                }
              }
            })
          }
        })
      }
    } else {
      methodNotAllowed(response)
    }
  }
}

var COLUMNS = 60
var wrapParagraph = wordwrap(COLUMNS)
var wrapItem = wordwrap(4, COLUMNS)

function jsonToTXT (json) {
  return straightenQuotes(
    [
      wrapParagraph(json.title),
      wrapParagraph('Version ' + json.version),
      wrapParagraph(json.preamble)
    ]
      .concat(
        json.items.map(function (item, index) {
          return index + '.  ' + wrapItem(item).trim()
        }),
        wrapParagraph(json.copyright),
        wrapParagraph(json.license)
      )
      .join('\n\n')
  )
}
