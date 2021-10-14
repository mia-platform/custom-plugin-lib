/*
 * Copyright 2021 Mia srl
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

'use strict'

const addFormats = require('ajv-formats')

function configureAjvPlugins(ajv, ajvPluginsOptions) {
  if (ajvPluginsOptions['ajv-formats'] && ajvPluginsOptions['ajv-formats'].formats) {
    addFormats(ajv, ajvPluginsOptions['ajv-formats'].formats)
  }
}
function configureAjvVocabulary(ajv, ajvVocabulary) {
  ajv.addVocabulary(ajvVocabulary)
}

module.exports = (ajv, ajvServiceOptions = {}) => {
  if (ajvServiceOptions.vocabulary) {
    configureAjvVocabulary(ajv, ajvServiceOptions.vocabulary)
  }
  if (ajvServiceOptions.plugins) {
    configureAjvPlugins(ajv, ajvServiceOptions.plugins)
  }
}
