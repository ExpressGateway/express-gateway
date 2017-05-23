'use strict'

module.exports = {
	redis: {
		host: 'localhost',
		port: '5555'
	},
	users: {
		redis: {
			userHashPrefix: 'TEST-ENV-USER',
      usernameSetPrefix: 'TEST-ENV-USERNAME',
      emailSetPrefix: 'TEST-ENV-EMAIL'
		},
    usernameMaxLength: 15,
    usernameMinLength: 3,
	},
  bcrypt: {
    saltRounds: 10
  },
  apps: {
    redis: {
      appHashPrefix: 'TEST-ENV-APP',
      userAppsHashPrefix: 'TEST-ENV-USER-APPS'
    }
  },
  credentials: {
    redis: {
      scopePrefix: 'SCOPE',
      scopeCredentialPrefix: 'SCOPE-CREDENTIAL', // 'SCOPE-CREDENTIAL:someScope': { cred100: true, cred200: true }
      credentialPrefixes: {
        oauth: 'OAUTH',
        basicAuth: 'BASIC-AUTH'
      }
    },
   
    basicAuth: {
      /* passwordKey is required for all credentials. 
       * Usually it's just 'password' or 'secret', but users can define it themselves 
       * In the case below, passwordKey is 'password'. So, when defining a credential, 
       * 'password' must be supplied as a parameter
       */
      passwordKey: 'password',
      autoGeneratePassword: true, // If password is not supplied, it will auto-generate a uuid as password
      properties: { // additional properties part of the credentials object
        scopes:   { isRequired: true },
      }
    },
    oauth: {
      passwordKey: 'secret',
      autoGeneratePassword: true,
      properties: { 
        scopes: { isRequired: false }
      }
    }
  }
}