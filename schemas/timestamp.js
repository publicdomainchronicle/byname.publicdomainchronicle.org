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
    timestamp: {
      type: 'string',
      format: 'date-time'
    }
  },
  required: [
    'timestamp',
    'digest',
    'uri'
  ],
  additionalProperties: false,
  definitions: {
    digest: require('./digest')
  }
}
