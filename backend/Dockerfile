FROM node:16-alpine AS build
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
RUN npm ci --production

FROM node:16-alpine
COPY --from=build node_modules ./node_modules
COPY --from=build out ./
CMD node index.js