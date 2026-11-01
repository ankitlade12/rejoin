FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
COPY lib ./lib
COPY server.mjs ./
RUN mkdir -p /app/.data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=4173
EXPOSE 4173
CMD ["node", "server.mjs"]
