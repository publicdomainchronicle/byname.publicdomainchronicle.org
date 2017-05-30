var tape = require('tape')
var AJV = require('ajv')

var validator = new AJV()
var validate = validator.compile(require('../schema.json'))

tape('schema', function (suite) {
  suite.test('simple, valid example', function (test) {
    test.assert(
      validate({
        dbos: '1.0.0-pre1',
        name: 'Kyle Evan Mitchell',
        affiliation: 'BioBricks Foundation',
        journals: ['Nature'],
        classifications: ['G06F 3/00'],
        publications: [
          'ebc72160fa6fcdce751e5d7298c8df58' +
          '3e6131eec161faf52094159e05c6d350'
        ],
        title: 'Distributed Digital Prior Art Publication',
        description: 'Blah blah blah blah blah...',
        safety: '',
        attachments: [
          {
            format: 'application/javascript',
            digest:
              '1094aa01ef2335fd02e8d1346be39ddd' +
              '40847ca749d0d6dbb29ad03610342231'
          }
        ],
        commitment: '1.0.0',
        license: '1.0.0'
      })
    )
    test.end()
  })
})
