const logger = require('../../logger').policy;
const { PassThrough } = require('stream');
const jsonParser = require('express').json();
const urlEncoded = require('express').urlencoded({ extended: false });

module.exports = {
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/body-modifier.json',
    type: 'object',
    definitions: {
      addRemove: {
        type: 'object',
        properties: {
          add: {
            type: ['array'],
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' }
              }
            },
            default: []
          },
          remove: {
            type: ['array'],
            items: {
              type: 'string'
            },
            default: []
          }
        }
      }
    },
    properties: {
      request: { '$ref': '#/definitions/addRemove' },
      response: { '$ref': '#/definitions/addRemove' }
    }
  },
  policy: params => {
    return (req, res, next) => {
      jsonParser(req, res, (err) => {
        if (err) return next(err);

        urlEncoded(req, res, (err) => {
          if (err) return next(err);

          if (params.request) {
            params.request.add.forEach(addParam => { req.body[addParam.name] = req.egContext.run(addParam.value); });
            params.request.remove.forEach(removeParam => { delete req.body[removeParam]; });

            req.egContext.requestStream = new PassThrough();
            const bodyData = JSON.stringify(req.body);
            req.headers['content-length'] = Buffer.byteLength(bodyData);
            req.egContext.requestStream.write(bodyData);
          }

          if (params.response) {
            const _write = res.write;
            res.write = (data) => {
              try {
                const body = JSON.parse(data);

                params.response.add.forEach(addParam => { body[addParam.name] = req.egContext.run(addParam.value); });
                params.response.remove.forEach(removeParam => { delete body[removeParam]; });

                const bodyData = JSON.stringify(body);

                res.setHeader('Content-Length', Buffer.byteLength(bodyData));
                _write.call(res, bodyData);
              } catch (e) {
                logger.warn(e);
                _write.call(res, data);
              }
            };
          }
          next();
        });
      });
    };
  }
};
