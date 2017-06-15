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

var englishMonths = require('english-months')

module.exports = function (string) {
  var date = new Date(string)
  return (
    englishMonths[date.getMonth()] +
    ' ' + date.getDate() +
    ', ' + date.getFullYear() +
    ' at ' +
    date.getHours() +
    ':' +
    date.getMinutes() +
    ':' +
    (
      /* istanbul ignore next */
      date.getSeconds() < 10
        ? '0' + date.getSeconds()
        : date.getSeconds()
    ) +
    ' GMT'
  )
}
