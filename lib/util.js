/*
 * Copyright 2018 Mia srl
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

function longerThan(len) {
  return function longer(arraylike) {
    return arraylike.length > len
  }
}

function getUserId(userId) {
  if (!userId) {
    return null
  }
  return userId
}

function getGroups(groups) {
  return groups.split(',').filter(longerThan(0))
}

function getClientType(clientType) {
  if (!clientType) {
    return null
  }
  return clientType
}

function isFromBackOffice(isFBO) {
  return Boolean(isFBO)
}

module.exports = {
  getUserId,
  getGroups,
  getClientType,
  isFromBackOffice,
}
