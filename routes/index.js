var serveFile = require('./serve-file')

var routes = module.exports = require('http-hash')()

routes.set('/', serveFile('homepage.html'))
