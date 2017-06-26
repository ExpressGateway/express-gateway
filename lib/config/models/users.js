'use strict';

module.exports = {
  properties: {
    firstname: {isRequired: true, isMutable: true},
    lastname: {isRequired: true, isMutable: true},
    email: {isRequired: false, isMutable: true},
    redirectUri: {isRequired: false, isMutable: true}
  }
};
