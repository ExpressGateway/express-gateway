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
  }
}