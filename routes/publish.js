/* Copyright 2017 The BioBricks Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var Busboy = require('busboy')
var FormData = require('form-data')
var concat = require('concat-stream')
var ecb = require('ecb')
var fs = require('fs')
var https = require('https')
var latest = require('../latest')
var methodNotAllowed = require('./method-not-allowed')
var mustache = require('mustache')
var parse = require('json-parse-errback')
var path = require('path')
var publish = require('../publish')
var pump = require('pump')
var through2 = require('through2')

var declaration = latest(require('../documents/declaration.json'))
var license = latest(require('../documents/license.json'))

var JOURNALS = require('pct-minimum-documentation')
  .map(function (element) {
    return element.B
  })
  .sort()

var TEMPLATE = path.join(
  __dirname, '..', 'templates', 'publish.html'
)

function get (request, response, configuration, errors) {
  response.setHeader('Content-Type', 'text/html; charset=UTF-8')
  fs.readFile(TEMPLATE, 'utf8', function (error, template) {
    /* istanbul ignore if */
    if (error) {
      response.statusCode = 500
      response.end()
    } else {
      response.end(
        mustache.render(template, {
          journals: JOURNALS,
          RECAPTCHA_PUBLIC: configuration.recaptcha.public,
          errors: errors,
          license: license,
          declaration: declaration
        })
      )
    }
  })
}

// TODO:  Refactor.
function post (request, response, configuration) {
  var parser
  /* istanbul ignore next */
  try {
    // TODO:  Give busboy file count and size limits.
    parser = new Busboy({headers: request.headers})
  } catch (error) {
    response.statusCode = 400
    response.end()
    return
  }
  var fields = {}
  var through = through2.obj()
  pump(
    through,
    publish(configuration, request.log, function (digest) {
      var location = '/publications/' + digest
      response.statusCode = 201
      response.setHeader('Content-Type', 'text/html; charset=UTF-8')
      response.setHeader('Location', location)
      response.end(redirectTo(location))
    }),
    function (error) {
      if (error) {
        request.log.error(error)
        response.statusCode = error.statusCode || 500
        response.end()
      }
    }
  )
  request.pipe(
    parser
      .on('field', function (field, value) {
        if (field.endsWith('[]')) {
          field = field.substring(0, field.length - 2)
          if (fields[field] && Array.isArray(fields[field])) {
            fields[field].push(value)
          } else {
            fields[field] = [value]
          }
        } else {
          fields[field] = value
        }
      })
      .on('file', function (field, file, filename, encoding, mimetype) {
        through.write({
          type: 'attachment',
          stream: file,
          filename: filename,
          encoding: encoding,
          mimetype: mimetype
        })
      })
      .once('finish', function () {
        var captchaResponse = fields['g-recaptcha-response']
        delete fields['g-recaptcha-response']
        verifyCatpcha(
          captchaResponse, configuration.recaptcha.secret,
          function (error, success) {
            /* istanbul ignore if */
            if (error) {
              response.statusCode = 500
              response.end()
              through.end()
            /* istanbul ignore next */
            } else if (success === false) {
              response.statusCode = 400
              response.end('invalid captcha')
              through.end()
            } else {
              normalize(fields)
              through.write(fields)
              through.end()
            }
          }
        )
      })
  )
}

/* istanbul ignore next */
function verifyCatpcha (response, secret, callback) {
  if (process.env.NODE_ENV === 'test') {
    process.nextTick(function () {
      callback(null, true)
    })
  } else if (typeof response === 'string') {
    var form = new FormData()
    form.append('response', response)
    form.append('secret', secret)
    form.pipe(
      https.request({
        method: 'POST',
        host: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        headers: form.getHeaders()
      }, function (response) {
        response.pipe(concat(function (body) {
          parse(body, ecb(callback, function (data) {
            callback(null, data.success)
          }))
        }))
      })
    )
  } else {
    process.nextTick(function () {
      callback(null, false)
    })
  }
}

module.exports = function (request, response, configuration) {
  var method = request.method
  if (method === 'GET') {
    get(request, response, configuration)
  } else if (request.method === 'POST') {
    post(request, response, configuration)
  } else {
    methodNotAllowed(response)
  }
}

function redirectTo (location) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Redirecting&hellip;</title>
        <meta http-equiv=refresh content="0;URL='${location}'">
      </head>
      <body>
        <p>
          Redirecting to <a href=${location}>${location}</a>&hellip;
        </p>
      </body>
    </html>
  `
}

var DELETE_IF_EMPTY = [
  'name', 'affiliation',
  'journals', 'classifications', 'publications',
  'safety'
]

var ARRAYS = ['journals', 'classifications', 'publications']

var NORMALIZE_LINES = ['finding', 'safety']

function normalize (record) {
  ARRAYS.forEach(function (key) {
    if (!record.hasOwnProperty(key)) {
      record[key] = []
    }
  })
  DELETE_IF_EMPTY.forEach(function (key) {
    if (Array.isArray(record[key])) {
      record[key] = record[key].filter(function (element) {
        return element !== ''
      })
    } else if (record[key] === '') {
      delete record[key]
    }
  })
  NORMALIZE_LINES.forEach(function (key) {
    if (typeof record[key] === 'string') {
      record[key] = record[key].replace(/\r/g, '')
    }
  })
}
