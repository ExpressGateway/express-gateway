#### A Microservices API Gateway Built Using Express.js and Express Middleware
----

[![npm][npm-version-badge]][npm-package-url]
[![CircleCI][circleci-badge]][circleci-master-url]
[![Azure Pipelines][azure-badge]][azure-master-url]
[![CodeCov][codecov-badge]][codecov-master-url]
[![Gitter][gitter-badge]][gitter-room-url]
[![Module LTS Adopted'](https://img.shields.io/badge/Module%20LTS-Adopted-brightgreen.svg?style=flat)](http://github.com/CloudNativeJS/ModuleLTS)

[![Express-Gateway][eg-wordmark-companion]][eg-website]

Express Gateway is a microservices API gateway that sits at the heart of any microservices or serverless architecture, regardless of what language or platform you're using.

Express Gateway secures your microservices and serverless functions and expose them through APIs using Node.js, Express and Express middleware.

Developing cloud native applications, orchestrating and managing them now can be done insanely fast all on one seamless platform without having to introduce additional infrastructure.

---

### [Website][eg-website] &nbsp; [Getting Started][eg-getting-started] &nbsp; [Docs][eg-docs]

---
#### Main Features
- Microservices and Serverless QoS Proxy and Security
- Built Entirely on JavaScript/Node.js using Express and Express Middleware
- Dynamic Centralized Config
- API Consumer and Credentials Management
- Plugins and Plugin Framework
- Distributed Data Store
- CLI
- REST API
- Cloud Native Execution

#### Installation
If you have Node.js already installed:

```bash
# install Express Gateway
$ npm install -g express-gateway
```

#### Creating a Gateway

```bash
# create a new gateway using the CLI
$ eg gateway create
```

#### Get Help
Need help or have a question?
- [Express Gateway Documentation][eg-docs]
- [Frequently Asked Questions (FAQ)][eg-faq]

#### Community
Express has a community that we hope to extend further with Express Gateway's gateway use case for Express and its middleware.

- Come chat with us in [Gitter][gitter-room-url]
- [Twitter (@express_gateway)][eg-twitter]
- [Google Group][eg-newsgroup]
- [Facebook][eg-facebook]

#### Roadmap
The Express Gateway roadmap consists of three parts:
1. [FeatHub][eg-feathub] - features requested and voted on by any community member, this feeds into the...
2. [Roadmap][eg-roadmap] - the published roadmap of all features under considerations and projected timeframes, the highest priority items are put into the...
3. [Waffle board][eg-waffle] - a real time as a public task board on Waffle.io with backlog of stories for the next release

### LTS Policy

  | Module Version   | Release Date | Minimum EOL | EOL With     | Status  |
  |------------------|--------------|-------------|--------------|---------|
  | 1.x.x 	         | Jul 2016	    | Dec 2019    | Node 8       | Current |

#### Contribution
All contributions welcome! Please see the [contributor's guide][contributor-guide]

#### License

[Apache-2.0 License][apache-license]

Copyright © Express Gateway Contributors

[npm-version-badge]: https://img.shields.io/npm/v/express-gateway.svg
[npm-package-url]: https://www.npmjs.com/package/express-gateway
[circleci-badge]: https://circleci.com/gh/ExpressGateway/express-gateway/tree/master.svg?style=shield&circle-token=ac6b0e86b46220da43a5ae63a267d12e81ccb2d5
[azure-badge]: https://dev.azure.com/vncz/vncz/_apis/build/status/ExpressGateway.express-gateway?branchName=master
[circleci-master-url]: https://circleci.com/gh/ExpressGateway/express-gateway/tree/master
[azure-master-url]: https://dev.azure.com/vncz/vncz/_build?definitionId=2&_a=summary
[codecov-badge]: https://img.shields.io/codecov/c/github/ExpressGateway/express-gateway/master.svg
[codecov-master-url]: https://codecov.io/gh/ExpressGateway/express-gateway
[gitter-badge]: https://img.shields.io/gitter/room/expressgateway/express-gateway.svg
[gitter-room-url]: https://gitter.im/ExpressGateway/express-gateway
[eg-wordmark-companion]: logo/wordmark-and-companion-graphic/ExpressGateway_Wordmark+Companion.png
[eg-website]: http://www.express-gateway.io
[eg-getting-started]: http://www.express-gateway.io/getting-started
[eg-docs]: http://www.express-gateway.io/docs
[eg-feathub]: http://feathub.com/ExpressGateway/express-gateway
[eg-roadmap]: https://github.com/ExpressGateway/express-gateway/wiki/Express-Gateway-Roadmap
[eg-waffle]: https://waffle.io/ExpressGateway/express-gateway
[eg-faq]: http://www.express-gateway.io/docs/faq
[eg-twitter]: https://twitter.com/express_gateway
[eg-newsgroup]: https://groups.google.com/a/express-gateway.io/forum/#!forum/discuss
[eg-facebook]: https://www.facebook.com/expressjsgateway
[eg-support]: https://goo.gl/s8eGKz?_ga=2.243837062.2081566642.1553116846-2009977705.1552945890
[contributor-guide]: https://github.com/ExpressGateway/express-gateway/blob/master/Contributing.md
[apache-license]: https://github.com/expressgateway/express-gateway/blob/master/LICENSE
