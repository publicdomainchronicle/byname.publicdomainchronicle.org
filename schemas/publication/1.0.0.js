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

module.exports = {
  $schema: 'http://json-schema.org/draft-06/schema#',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      maxLength: 256
    },
    affiliation: {
      type: 'string',
      maxLength: 256
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 256
    },
    finding: {
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
      enum: Object.keys(require('../../documents/declaration.json'))
    },
    license: {
      type: 'string',
      enum: Object.keys(require('../../documents/license.json'))
    }
  },
  required: [
    'title',
    'finding',
    'declaration',
    'license'
  ],
  additionalProperties: false,
  definitions: {
    digest: require('../digest')
  }
}
