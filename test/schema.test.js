var tape = require('tape')
var AJV = require('ajv')

tape('schema', function (suite) {
  suite.test('publication', function (test) {
    var validate = new AJV({
      allErrors: true,
      verbose: true
    })
      .compile(require('../schemas/publication'))
    validate({
      name: 'Kyle Evan Mitchell',
      affiliation: 'BioBricks Foundation',
      journals: ['Nature'],
      classifications: ['G06F 3/00'],
      publications: [
        'ebc72160fa6fcdce751e5d7298c8df58' +
        '3e6131eec161faf52094159e05c6d350'
      ],
      title: 'Distributed Digital Prior Art Publication',
      finding: 'Blah blah blah blah blah...',
      attachments: [
        '1094aa01ef2335fd02e8d1346be39ddd' +
        '40847ca749d0d6dbb29ad03610342231'
      ],
      declaration: '0.0.0',
      license: '0.0.0'
    })
    test.equal(validate.errors, null)
    test.end()
  })

  suite.test('timestamp', function (test) {
    var validate = new AJV({
      allErrors: true,
      verbose: true
    })
      .compile(require('../schemas/timestamp'))
    validate({
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
    })
    test.equal(validate.errors, null)
    test.end()
  })
})
