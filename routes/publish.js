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

var Busboy = require('busboy')
var FormData = require('form-data')
var concat = require('concat-stream')
var escape = require('./escape')
var html = require('./html')
var https = require('https')
var latest = require('../latest')
var methodNotAllowed = require('./method-not-allowed')
var parse = require('json-parse-errback')
var publish = require('../publish')
var pump = require('pump')
var through2 = require('through2')

var footer = require('./partials/footer')
var head = require('./partials/head')
var header = require('./partials/header')
var nav = require('./partials/nav')

var declaration = latest(require('../documents/declaration/declaration.json'))
var license = latest(require('../documents/license/license.json'))

var JOURNALS = require('pct-minimum-documentation')
  .map(function (element) {
    return element.B
  })
  .sort()

function get (request, response, configuration, errors) {
  response.setHeader('Content-Type', 'text/html; charset=UTF-8')
  response.end(
    template({
      journals: JOURNALS,
      RECAPTCHA_PUBLIC: configuration.recaptcha.public,
      errors: errors,
      license: license,
      declaration: declaration
    })
  )
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
        if (value.length === 0) return
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
          parse(body, function (error, data) {
            if (error) return callback(error)
            callback(null, data.success)
          })
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

var DELETE_IF_EMPTY = ['name', 'affiliation', 'safety']

var ARRAYS = ['journals', 'classifications']

var NORMALIZE_LINES = ['finding', 'safety']

function normalize (record) {
  record.metadata = {}
  ARRAYS.forEach(function (key) {
    if (record.hasOwnProperty(key) && record[key].length !== 0) {
      var list = record[key]
      delete record[key]
      record.metadata[key] = list
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

function template (data) {
  var license = data.license
  var declaration = data.declaration
  return html`
<!doctype html>
<html lang=en>
  ${head('Publish')}
  <body>
    ${header()}
    ${nav()}

    <main>
      <p>
        Use this form to contribute scientific work to the public domain
        by publishing it to the Public Domain Chronicle.  For more about
        PDC, see
        <a
            href=https://publicdomainchronicle.org
            target=_blank>publicdomainchronicle.org</a>.
      </p>

      <aside class=legal>
        Do not break the law, any institutional policy, or any contract
        by publishing in PDC.
      </aside>

      ${data.errors && html`
        <p class=bad>The submitted publication had invalid input.</p>
      `}

      <form method=post action=/publish enctype=multipart/form-data>
        <input type=hidden name=version value=1.0.0>

        <section class=optional>
          <h1>Contributor</h1>

          <aside class=legal>
            To publish in PDC, you must grant a public copyright
            license for your submission.  Usually, the one who writes
            the materials is the one who has to give the license.
            The answers to this form, especially the title, finding,
            and any attachments, should be your own work.
          </aside>

          <section>
            <h2>Name</h2>

            <p>Please provide your full name.</p>

            <p>
              If you want to publish to PDC anonymously, leave this
              field blank.
            </p>

            <input name=name type=text autocomplete=name>
          </section>

          <section>
            <h2>Affiliation</h2>

            <p>
              Please provide the legal name of the commercial, academic,
              nonprofit, governmental, or other organization you work for,
              if any.
            </p>

            <p>
              If you want to publish to PDC anonymously, leave this
              field blank.
            </p>

            <input name=affiliation type=text autocomplete=organization>
          </section>
        </section>

        <section class=required>
          <h2>Title</h2>

          <p>
            Provide a title for your submission, describing what you've
            found and how it is useful, in the terms most natural for
            you and colleagues in your field.
          </p>

          <input name=title type=text maxlength=256 spellcheck required>
        </section>

        <section id=finding class=required>
          <h2>Finding</h2>

          <p>
            Describe what you&rsquo;ve found, and explain the best way
            that someone in your field can use it themselves.  Feel free
            to use multiple paragraphs if necessary.
          </p>

          <aside class=legal>
            This is the most important part.  If your description
            enables others in your field to make and use what you've
            found, publishing it helps secure it for the public domain.
            If at all possible, have a colleague review your description
            and tell you if it&rsquo;s missing anything that isn&rsquo;t
            obvious.
          </aside>

          <textarea
              name=finding
              rows=30
              maxlength=28000
              spellcheck
              required></textarea>
        </section>

        <section id=safety class=optional>
          <h2>Safety Notes</h2>

          <p>
            Optionally describe any special safety precautions others
            might like to take when trying and using your invention,
            to protect themselves, other people, and the environment.
          </p>

          <textarea name=safety rows=10 spellcheck></textarea>
        </section>

        <section id=attachments class=optional>
          <h1>Attachments</h1>

          <p>
            If images or other data files help describe your
            finding or how to use it, attach them here.
            Standard-format scientific data files, like
            <a
                href=http://zhanglab.ccmb.med.umich.edu/FASTA/
                target=_blank>FASTA</a>
            and
            <a href=http://sbolstandard.org/ target=_blank>SBOL</a>
            files for genetic information,
            for example, are especially important.  Please
            <em>don&rsquo;t</em> attach a preprint PDF or article.
            Those best belong on a preprint server, like
            <a href=http://biorxiv.org target=_blank>bioR&#x1D712;iv</a>.
          </p>

          <aside class=legal>
            Consider publishing computer code, data files,
            and other technical work to a public repository
            like <a href=https://github.com>GitHub</a> under an <a
            href=https://opensource.org/licenses>open source software</a>,
            <a href=https://opendatacommons.org/licenses>open data</a>,
            or similar license.
          </aside>

          <ul class=inputs>
            ${html`
              <li><input name=attachments[] type=file></li>
            `.repeat(3)}
          </ul>
        </section>

        <section class=recommended>
          <h1>Metadata</h1>

          <p>
            &ldquo;Metadata&rdquo;, or data about data, help researchers
            and computer programs catalog, index, and search digital
            records like your publication.  Taking a few seconds to add
            metadata to your publication transforms it from a needle in
            a haystack into a useful record for reseachers.
          </p>

          <section>
            <h2>Journals</h2>

            <p>
              Which journals do others interested in the area of your
              invention publish in and read?  Tick the boxes next to
              the journals most relevant to the field of your invention.
              Usually, two or three journals are enough.
            </p>

            <ul id=journals class=listOfCheckBoxes>
              ${data.journals.map(function (journal) {
                return html`
                <li>
                  <label>
                    <input
                        name=journals[]
                        type=checkbox
                        value="${escape(journal)}">
                    ${escape(journal)}
                  </label>
                </li>
                `
              })}
            </ul>
          </section>

          <section id=classifications>
            <h2>Patent Classifications</h2>

            <p>
              The
              <a href=http://web2.wipo.int/classifications/ipc/ipcpub
                >International Patent Classification</a>
              is a standardized taxonomy of technologies, referred to by codes.
              For example,
              <a href=http://web2.wipo.int/classifications/ipc/ipcpub?notion=scheme&version=20170101&symbol=C12N0009000000&menulang=en&lang=en&viewmode=m&fipcpc=no&showdeleted=yes&indexes=no&headings=yes&notes=yes&direction=o2n&initial=A&cwid=none&tree=no&searchmode=smart
                ><code>C12N 0/900</code></a>
              denotes
              <a href=https://en.wikipedia.org/wiki/Oxidoreductase>oxidoreductases</a>.
            </p>

            <div id=ipcSearch>
              <p>Search for patent classifications:</p>
              <input type=search id=ipcSearchBox>
              <button id=ipcSearchButton>Search</button>
              <ul class=inputs id=ipcs></ul>
            </div>
          </section>

          <section id=links>
            <h2>Other PDC Publications</h2>

            <p>
              If the invention builds from or refers to previous PDC
              publications, copy their cryptographic digests into the
              boxes below.
            </p>

            <ul class=inputs>
              ${html`
                <li>
                  <input
                      name=links[]
                      type=text
                      pattern="^[abcdef0-9]{64}$"
                      placeholder="SHA-256 digest">
                </li>
              `.repeat(3)}
            </ul>
          </section>
        </section>

        ${declaration && html`
        <section id=declaration class=required>
          <h2>${escape(declaration.title)}</h2>
          <p class=version>Version ${escape(declaration.version)}</p>

          <p class=preamble>${escape(declaration.preamble)}</p>
          <ol>
            ${declaration.items.map(function (item) {
              return html`<li>${escape(item)}</li>`
            })}
          </ol>

          <label>
            <input
                name=declaration
                type=checkbox
                value="${escape(declaration.version)}"
                required>
            Check this box to make the declaration above.
          </label>
        </section>
        `}

        ${license && html`
        <section id=license class=required>
          <h2>${escape(license.title)}</h2>
          <p class=version>Version ${escape(license.version)}</p>

          <p class=preamble>${escape(license.preamble)}</p>
          <ol>
            ${license.items.map(function (item) {
              return html`<li>${escape(item)}</li>`
            })}
          </ol>

          <label>
            <input
                name=license
                type=checkbox
                value="${escape(license.version)}"
                required>
            Check this box to grant the license above.
          </label>
        </section>
        `}

        <section id=submit>
          <h2>Publish</h2>

          <p>
            Submittions to PDC are published instantly, publicly, and
            permanently.  Please take a moment to review your responses.
          </p>

          <div class=g-recaptcha data-sitekey="${data.RECAPTCHA_PUBLIC}"></div>
          <noscript>
            <div>
              <div style="width: 302px; height: 422px; position: relative;">
                <div style="width: 302px; height: 422px; position: absolute;">
                  <iframe
                      src="https://www.google.com/recaptcha/api/fallback?k=${data.RECAPTCHA_PUBLIC}"
                      frameborder=0
                      scrolling=no
                      style="width: 302px; height:422px; border-style: none;">
                  </iframe>
                </div>
              </div>
              <div
                style="width: 300px; height: 60px; border-style: none; bottom: 12px; left: 25px; margin: 0px; padding: 0px; right: 25px; background: #f9f9f9; border: 1px solid #c1c1c1; border-radius: 3px;">
                <textarea
                    id=g-recaptcha-response
                    name=g-recaptcha-response
                    class=g-recaptcha-response
                    style="width: 250px; height: 40px; border: 1px solid #c1c1c1; margin: 10px 25px; padding: 0px; resize: none;"
                ></textarea>
              </div>
            </div>
          </noscript>

          <input type=submit value="Publish to PDC">
        </section>
      </form>
    </main>

    ${footer()}

    <script src=publish.js></script>
    <script src=https://www.google.com/recaptcha/api.js></script>
  </body>
</html>
  `
}
