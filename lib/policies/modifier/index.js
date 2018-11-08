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
            type: ['array'],
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' }
              }
            }
          },
          remove: {
            type: ['array'],
            items: {
              type: 'string'
            }
          }
        }
      },
      transformSpec: {
        type: 'object',
        properties: {
          headers: { '$ref': '#/definitions/addRemove' },
          body: { '$ref': '#/definitions/addRemove' }
        }
      }
    },
    properties: {
      request: { '$ref': '#/definitions/transformSpec' },
      response: { '$ref': '#/definitions/transformSpec' }
    }
  },
  policy: params => {
    const transformObject = (transformSpecs, egContext, obj) => {
      if (transformSpecs.add) {
        transformSpecs.add.forEach(addParam => { obj[addParam.name] = egContext.run(addParam.value); });
      }
      if (transformSpecs.remove) {
        transformSpecs.remove.forEach(removeParam => { delete obj[removeParam]; });
      }

      return obj;
    };

    return (req, res, next) => {
      if (params.request.body) {
        jsonParser(req, res, (err) => {
          if (err) return next(err);

          urlEncoded(req, res, (err) => {
            if (err) return next(err);
            const bodyData = JSON.stringify(transformObject(params.request.body, req.egContext, req.body));
            req.headers['content-length'] = Buffer.byteLength(bodyData);
            req.egContext.requestStream = new PassThrough();
            req.egContext.requestStream.write(bodyData);
          });
        });
      }

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
          if (!headers) {
            return _writeHead(statusCode, statusMessage, headers);
          }

          return _writeHead(statusCode, statusMessage, transformObject(params.response.headers, req.egContext, headers));
        };
      }
      next();
    };
  }
};
