module.exports = {
  $schema: 'http://json-schema.org/draft-06/schema#',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      maxLength: 256,
      examples: [
        'John Scientist',
        'Jane Scientist'
      ]
    },
    affiliation: {
      type: 'string',
      maxLength: 256,
      examples: [
        'Leland Stanford Junior University',
        'General Electric Co.'
      ]
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 256
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 28000
    },
    safety: {
      type: 'string',
      maxLength: 28000
    },
    attachments: {
      type: 'array',
      items: {
        $ref: '#/definitions/digest'
      },
      uniqueItems: true
    },
    journals: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 256
      },
      uniqueItems: true
    },
    classifications: {
      type: 'array',
      items: {
        description: 'International Patent Classification',
        type: 'string',
        pattern: '[ABCDEFGH][0-9][0-9][A-Z] [0-9]{1,3}/[0-9]{2,}'
      },
      uniqueItems: true
    },
    publications: {
      type: 'array',
      items: {
        $ref: '#/definitions/digest'
      },
      uniqueItems: true
    },
    declaration: {
      type: 'string',
      enum: [
        '0.0.0'
      ]
    },
    license: {
      type: 'string',
      enum: [
        '0.0.0'
      ]
    }
  },
  required: [
    'title',
    'description',
    'declaration',
    'license'
  ],
  additionalProperties: false,
  definitions: {
    digest: require('./digest')
  }
}
