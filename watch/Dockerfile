FROM node:24.11.0

WORKDIR /app
COPY ./package-lock.json ./package.json ./
RUN npm ci
COPY ./tsconfig.json ./
COPY ./src/ ./src/
RUN npm run build
ENTRYPOINT ["npm", "run", "start"]