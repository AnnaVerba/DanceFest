# Dev-образ для Vite/React.
# npm install, а не npm ci: lock-файл згенеровано на Windows і не містить
# опційних Linux-бінарників rollup, потрібних vite всередині контейнера.
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
