module.exports = {
  $schema: 'http://json-schema.org/draft-06/schema#',
  type: 'object',
  properties: {
    digest: {
      $ref: '#/definitions/digest'
    },
    uri: {
      type: 'string',
      format: 'uri'
    },
    time: {
      type: 'string',
      format: 'date-time'
    }
  },
  required: [
    'time',
    'digest',
    'uri'
  ],
  additionalProperties: false,
  definitions: {
    digest: require('./digest')
  }
}
