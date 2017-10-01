var html = require('./html')
var escape = require('./escape')
var http = require('http')
var parse = require('json-parse-errback')
var querystring = require('querystring')
var simpleConcat = require('simple-concat')

var footer = require('./partials/footer')
var head = require('./partials/head')
var header = require('./partials/header')

var METADATA = [
  'journals',
  'naturesubjects',
  'ussubjectmatter',
  'classifications',
  'aaasaffiliates',
  'gordonresearchconferences',
]

// TODO: pagination

module.exports = function (request, response, configuration) {
  if (request.query.q) {
    http.request({
      host: configuration.solr.host,
      port: configuration.solr.port,
      path: '/solr/pdc/query?' + querystring.stringify({
        q: request.query.q
      })
    })
      .once('error', function (error) {
        request.log.error(error)
        response.statusCode = 500
        response.end()
      })
      .once('response', function (solrResponse) {
        simpleConcat(solrResponse, function (error, buffer) {
          parse(buffer, function (error, results) {
            response.setHeader('Content-Type', 'text/html; charset=UTF-8')
            response.end(html`
<!doctype html>
<html>
  ${head(configuration)}
  <body>
    ${header()}
    <main>
      <h1>Public Domain Chronicle Search</h1>
      <!--${JSON.stringify(results, null, 2)}-->
      <ol class=results>
        ${results.response.docs.map(function (result) {
          var url = (
            'https://' +
            configuration.pdc.host +
            configuration.pdc.path +
            'publications/' + result.id
          )
          return html`<li>
            <p class=title>
              <a href="${url}">${escape(result.title[0])}</a>
            </p>
            <p class=contributor>
              ${
                result.name ? escape(result.name[0]) : 'Anonymous'
              }${
                result.affiliation ? escape(', ' + result.affiliation[0]) : ''
              }
            </p>
            <ul class=metadata>
              ${METADATA.map(function (key) {
                if (result['metadata.' + key]) {
                  return result['metadata.' + key].map(function (element) {
                    return html`<li>${escape(element)}</li>`
                  })
                }
              })}
            </ul>
          </li>`
        })}
      </ol>
    </main>
    ${footer()}
  </body>
</html>
            `)
          })
        })
      })
      .end()
  } else {
    response.setHeader('Content-Type', 'text/html; charset=UTF-8')
    response.end(html`
<!doctype html>
<html>
  ${head(configuration)}
  <body>
    ${header()}
    <main>
      <h1>Public Domain Chronicle Search</h1>
      <form>
        <input type=search name=q>
        <input type=submit value=Search>
      </form>
    </main>
    ${footer()}
  </body>
</html>
    `)
  }
}
