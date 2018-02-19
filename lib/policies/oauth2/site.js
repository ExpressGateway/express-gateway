const passport = require('passport');
const path = require('path');
const services = require('../../services/index');

module.exports.loginForm = (request, response) => response.render(path.join(__dirname, 'views/login'));

module.exports.login = passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' });

module.exports.logout = (req, res) => {
  req.logout();
  if (!req.query.returnTo) {
    return res.redirect('/'); // TODO: implement settings section for default view path and return redirects
  }
  const returnUrl = decodeURI(req.query.returnTo);
  if (!req.query.clientId) {
    return res.redirect(returnUrl);
  }

  const client = services.application.get(req.query.clientId);
  if (client && client.redirectUri && client.redirectUri === returnUrl) {
    return res.redirect(returnUrl);
  }

  res.status(400).send(`Invalid return URI ${returnUrl} for client id ${req.query.clientId}`);
};
