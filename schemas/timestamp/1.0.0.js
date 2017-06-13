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
