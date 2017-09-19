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

var tape = require('tape')
var AJV = require('ajv')

tape('schema', function (suite) {
  suite.test('publication', function (test) {
    var validator = new AJV()
    validator.validate(
      require('../schemas/publication')['1.0.0'],
      {
        version: '1.0.0',
        name: 'Kyle Evan Mitchell',
        affiliation: 'BioBricks Foundation',
        metadata: {
          journals: ['Nature'],
          classifications: ['G06F 3/00']
        },
        links: [
          'ebc72160fa6fcdce751e5d7298c8df58' +
          '3e6131eec161faf52094159e05c6d350'
        ],
        title: 'Distributed Digital Prior Art Publication',
        finding: 'Blah blah blah blah blah...',
        attachments: [
          '1094aa01ef2335fd02e8d1346be39ddd' +
          '40847ca749d0d6dbb29ad03610342231'
        ],
        declaration: '1.0.0',
        license: '1.0.0'
      }
    )
    test.equal(validator.errors, null)
    test.end()
  })

  suite.test('timestamp', function (test) {
    var validator = new AJV()
    validator.validate(
      require('../schemas/timestamp')['1.0.0'],
      {
        version: '1.0.0',
        timestamp: {
          digest: (
            'ebc72160fa6fcdce751e5d7298c8df58' +
            '3e6131eec161faf52094159e05c6d350'
          ),
          uri: (
            'https://example.com/publications/' +
            'ebc72160fa6fcdce751e5d7298c8df58' +
            '3e6131eec161faf52094159e05c6d350'
          ),
          time: new Date().toISOString()
        },
        signature: (
          '185fc349e575b34559986cf7bc060bcc' +
          'de113aee8600077aadba828791559f36' +
          '0405c32f3573e7fea11d6d04c6daa7b4' +
          'd7a9eca1890741fd85c55fca72a4860c'
        )
      }
    )
    test.equal(validator.errors, null)
    test.end()
  })
})
