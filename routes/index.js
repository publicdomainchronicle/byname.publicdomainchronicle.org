var serveFile = require('./serve-file')

var routes = module.exports = require('http-hash')()

routes.set('/', serveFile('homepage.html'))
routes.set('/styles.css', serveFile('styles.css'))
routes.set('/guide', serveFile('guide.html'))
routes.set('/publish', serveFile('publish.html'))
