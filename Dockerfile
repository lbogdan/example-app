FROM node:18.18.0-bookworm-slim AS build

WORKDIR /build

COPY package.json yarn.lock ./

# this is cached as long as package.json and yarn.lock don't change
RUN CHECKSUM="$(md5sum yarn.lock)" && \
    yarn install && \
    # see yarn install --frozen-lockfile is not failing as expected:
    # https://github.com/yarnpkg/yarn/issues/5840#issuecomment-468782288
    if [ "$(md5sum yarn.lock)" != "$CHECKSUM" ]; then \
      echo "ERROR: yarn.lock updated after install" >&2; \
      exit 1; \
    fi

COPY ./ ./

RUN yarn bundle

FROM node:18.18.0-bookworm-slim

# this should be set when building
ARG VERSION
ENV VERSION=$VERSION

USER node:node

WORKDIR /app

COPY --from=build /build/dist/bundle.mjs ./

# this is purely informational
EXPOSE 3000/tcp

ENTRYPOINT ["node", "bundle.mjs"]
