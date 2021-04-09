'use strict'

const ABORT_CHAIN_STATUS_CODE = 418

const { getUserId, getGroups, getClientType, isFromBackOffice, getUserProperties } = require('./util')

function getUserIdFromBody() {
  return getUserId(this.getOriginalRequestHeaders()[this.USERID_HEADER_KEY])
}

function getUserPropertiesFromBody() {
  return getUserProperties(this.getOriginalRequestHeaders()[this.USER_PROPERTIES_HEADER_KEY])
}

function getGroupsFromBody() {
  return getGroups(this.getOriginalRequestHeaders()[this.GROUPS_HEADER_KEY] || '')
}

function getClientTypeFromBody() {
  return getClientType(this.getOriginalRequestHeaders()[this.CLIENTTYPE_HEADER_KEY])
}

function isFromBackOfficeFromBody() {
  return isFromBackOffice(this.getOriginalRequestHeaders()[this.BACKOFFICE_HEADER_KEY])
}

module.exports = {
  ABORT_CHAIN_STATUS_CODE,
  getUserIdFromBody,
  getUserPropertiesFromBody,
  getGroupsFromBody,
  getClientTypeFromBody,
  isFromBackOfficeFromBody,
}
