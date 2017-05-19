const keyauth = require('../src/actions/keyauth');
const httpMocks = require('node-mocks-http');

let req;
let res;

describe('key authentication tests', function(){

	beforeEach(function() {
		req = httpMocks.createRequest({
			method: 'GET',
			url: '/test/path'
		});
		res = httpMocks.createResponse();
	});

	it('should authenticate key in query', function(done) {
		req.query.apikey = '123';
		keyauth(req, res, function next(error) {
			if (error) { throw new Error('should not expect error'); }
			if (res.status == 401) {
				throw new Error('expected to authenticate key in query'); 
			}
			done();
		});
	});

	it('should authenticate key in body', function(done) {
		req.body.apikey = '123';
		keyauth(req, res, function next(error) {
			if (error) { throw new Error('should not expect error'); }
			if (res.status == 401) {
				throw new Error('expected to authenticate key in body'); 
			}
			done();
		});
	});

	it('should authenticate key in header', function(done) {
		req.headers['apikey'] = '123';
		keyauth(req, res, function next(error) {
			if (error) { throw new Error('should not expect error'); }
			if (res.status == 401) {
				throw new Error('expected to authenticate key in header'); 
			}
			done();
		});
	});

});
