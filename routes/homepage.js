var html = require('./html')

var footer = require('./partials/footer')
var head = require('./partials/head')
var header = require('./partials/header')
var nav = require('./partials/nav')

module.exports = function (request, response) {
  response.setHeader('Content-Type', 'text/html; charset=UTF-8')
  response.end(html`
<!doctype html>
<html>
  ${head()}
  <body>
    ${header()}
    ${nav()}
    <main>
      <h1>Public Domain Chronicle (PDC)</h1>
      <p class=lead>
        Public Domain Chronicle is a fast, easy, and free way to secure scientific methods and findings for the public domain.
      </p>
    </main>
    ${footer()}
  </body>
</html>
  `)
}
