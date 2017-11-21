const passportJWT = require('passport-jwt');

module.exports = {
  'header': passportJWT.ExtractJwt.fromHeader,
  'body': passportJWT.ExtractJwt.fromBodyField,
  'query': passportJWT.ExtractJwt.fromUrlQueryParameter,
  'authScheme': passportJWT.ExtractJwt.fromAuthHeaderWithScheme,
  'authBearer': passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken
};
