module.exports = {
  $schema: 'http://json-schema.org/draft-06/schema#',
  type: 'object',
  properties: {
    timestamp: {
      type: 'object',
      properties: {
        digest: {$ref: '#/definitions/digest'},
        uri: {
          type: 'string',
          format: 'uri'
        },
        time: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['time', 'digest', 'uri'],
      additionalProperties: false
    },
    signature: {$ref: '#/definitions/signature'}
  },
  required: ['timestamp', 'signature'],
  additionalProperties: false,
  definitions: {
    digest: require('../digest'),
    signature: require('../signature')
  }
}
