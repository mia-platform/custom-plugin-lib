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

class BusinessLogic {
  constructor(groupToGreet) {
    this.groupToGreet = groupToGreet
  }
  greet(user, groups) {
    const userString = user || 'World'
    if (groups.includes(this.groupToGreet)) {
      return {
        message: `Hello ${userString} of group: ${this.groupToGreet}!\n`,
        user,
        groups,
      }
    } else {
      return {
        message: `Hello ${userString}!\n`,
        user,
        groups,
      }
    }
  }
}

module.exports = BusinessLogic
