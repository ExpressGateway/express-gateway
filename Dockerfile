FROM node:8-alpine AS base

ENV NODE_ENV production
ENV NODE_PATH /usr/local/share/.config/yarn/global/node_modules/

FROM base as assets

RUN apk --no-cache add --virtual builds-deps build-base python
RUN yarn global add bcrypt --force

FROM base
LABEL maintainer Vincenzo Chianese, vincenzo@express-gateway.io
ENV EG_CONFIG_DIR /var/lib/eg

# Enable chokidar polling so hot-reload mechanism can work on docker or network volumes
ENV CHOKIDAR_USEPOLLING true
ARG EG_VERSION

VOLUME /var/lib/eg

RUN yarn global add express-gateway@$EG_VERSION
COPY --from=assets /usr/local/share/.config/yarn/global/node_modules/bcrypt \
                    /usr/local/share/.config/yarn/global/node_modules/bcrypt

COPY ./bin/generators/gateway/templates/basic/config /var/lib/eg
COPY ./lib/config/models /var/lib/eg/models

EXPOSE 8080 9876

CMD node -e "require('express-gateway')().run();"
