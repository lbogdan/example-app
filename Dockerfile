FROM node:18.18.2-bookworm-slim AS build

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

RUN mkdir sqlite3 && \
    cd sqlite3 && \
    yarn init -y && \
    yarn add sqlite3@5.1.6 --prod

FROM node:18.18.2-bookworm-slim

# this should be set when building
ARG VERSION
ENV VERSION=$VERSION

# run as user:group node:node
# USER 1000:1000

WORKDIR /app

COPY --from=build /build/dist/bundle.mjs ./
COPY --from=build /build/sqlite3/node_modules ./node_modules/

# this is purely informational
EXPOSE 3000/tcp

ENTRYPOINT ["node", "bundle.mjs"]
