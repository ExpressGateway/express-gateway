const keyauth = require('../src/actions/keyauth');
const httpMocks = require('node-mocks-http');

let req;
let res;

describe('key authentication tests', function(){

	beforeEach(function(done) {
		req = httpMocks.createRequest({
			method: 'GET',
			url: '/test/path'
		});
		res = httpMocks.createResponse();
		done();
	});

	it('should authenticate', function(done) {
		req.query.apikey = '123';
		keyauth(req, res, function next(error) {
			if (error) { throw new Error('should not expect error'); }
			if (res.status == 401) {
				throw new Error('expected to authenticate'); 
			}
			done();
		});
	});

});
