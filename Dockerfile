FROM node:8-alpine

LABEL maintainer Vincenzo Chianese, vincenzo@express-gateway.io

ARG EG_VERSION
ENV NODE_ENV production
ENV NODE_PATH /usr/local/share/.config/yarn/global/node_modules/
ENV EG_CONFIG_DIR /var/lib/eg

VOLUME /var/lib/eg

RUN yarn global add express-gateway@$EG_VERSION

COPY ./bin/generators/gateway/templates/basic/config /var/lib/eg
COPY ./lib/config/models /var/lib/eg/models

EXPOSE 8080 9876

CMD ["node", "-e", "require('express-gateway')().run();"]
