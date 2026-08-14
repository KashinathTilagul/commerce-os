FROM node:22-slim
RUN npm install -g @googleworkspace/cli@0.22.5
WORKDIR /app
COPY server.mjs /app/server.mjs
EXPOSE 8091
CMD ["node", "/app/server.mjs"]
