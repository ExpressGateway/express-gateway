const jsonParser = require('express').json();
const urlEncoded = require('express').urlencoded({ extended: true });
const { PassThrough } = require('stream');

module.exports = {
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/body-modifier.json',
    type: 'object',
    definitions: {
      addRemove: {
        type: 'object',
        properties: {
          add: {
            type: 'object',
            additionalProperties: {
              type: ['string', 'number']
            },
            minProperties: 1
          },
          remove: {
            type: ['array'],
            items: {
              type: 'string'
            }
          }
        },
        anyOf: [{ required: ['add'] }, { required: ['remove'] }]
      },
      transformSpec: {
        type: 'object',
        properties: {
          headers: { '$ref': '#/definitions/addRemove' },
          body: { '$ref': '#/definitions/addRemove' }
        },
        anyOf: [{ required: ['headers'] }, { required: ['body'] }]
      }
    },
    properties: {
      request: { '$ref': '#/definitions/transformSpec' },
      response: { '$ref': '#/definitions/transformSpec' }
    },
    anyOf: [{ required: ['request'] }, { required: ['response'] }]
  },
  policy: params => {
    const transformObject = (transformSpecs, egContext, obj) => {
      if (transformSpecs.add) {
        Object.keys(transformSpecs.add).forEach(addParam => { obj[addParam] = egContext.run(transformSpecs.add[addParam]); });
      }
      if (transformSpecs.remove) {
        transformSpecs.remove.forEach(removeParam => { delete obj[removeParam]; });
      }

      return obj;
    };

    return (req, res, next) => {
      let contentType = 'application/x-www-form-urlencoded';

      if (params.request.headers) {
        transformObject(params.request.headers, req.egContext, req.headers);
      }

      if (params.response.body) {
        const _write = res.write;
        res.write = (data) => {
          try {
            const body = transformObject(params.response.body, req.egContext, JSON.parse(data));
            const bodyData = JSON.stringify(body);

            res.setHeader('Content-Length', Buffer.byteLength(bodyData));
            _write.call(res, bodyData);
          } catch (e) {
            _write.call(res, data);
          }
        };
      }

      if (params.response.headers) {
        const _writeHead = res.writeHead;

        res.writeHead = (statusCode, statusMessage, headers) => {
          res._headers = transformObject(params.response.headers, req.egContext, res.getHeaders());
          return _writeHead.call(res, statusCode, statusMessage, headers);
        };
      }
      if (params.request.body) {
        jsonParser(req, res, (err) => {
          if (err) return next(err);
          if (req.body !== {}) contentType = 'application/json';

          urlEncoded(req, res, (err) => {
            if (req.body === {}) contentType = 'application/json';
            if (err) return next(err);

            const bodyData = JSON.stringify(transformObject(params.request.body, req.egContext, req.body));

            req.headers['content-length'] = Buffer.byteLength(bodyData);
            req.headers['content-type'] = contentType;

            req.egContext.requestStream = new PassThrough();
            req.egContext.requestStream.write(bodyData);

            next();
          });
        });
      } else {
        next();
      }
    };
  }
};
