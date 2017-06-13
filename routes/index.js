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
var glob = require('glob')
var path = require('path')
var serveDocument = require('./serve-document')
var serveFile = require('./serve-file')
var serveAllFiles = require('./serve-all-files')

var routes = module.exports = require('http-hash')()

routes.set('/', serveFile('homepage.html'))

serveAllFiles(routes, 'png')
serveAllFiles(routes, 'css')

routes.set('/about', serveFile('about.html'))

routes.set('/guide', serveFile('guide.html'))

routes.set('/publish', require('./publish'))
routes.set('/publish.js', serveFile('publish.js'))

routes.set('/key', require('./key'))

routes.set('/accessions', require('./accessions'))
routes.set('/accessions/:number', require('./accession'))

routes.set('/publications/:digest', require('./publication'))
routes.set('/publications/:digest/timestamps/:key', require('./timestamp'))
routes.set(
  '/publications/:digest/attachments/:attachment',
  require('./attachment')
)

routes.set('/robots.txt', serveFile('robots.txt'))

routes.set('/declaration', serveDocument('declaration'))
routes.set('/license', serveDocument('license'))
