# Dev-образ для NestJS API.
# node:22-slim (Debian), а не alpine: bcrypt тягне готові бінарники під glibc,
# на musl їх немає і збірка падає.
FROM node:22-slim

WORKDIR /app

# Спершу тільки маніфести — шар із залежностями кешується доти,
# доки package.json / package-lock.json не змінилися.
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start:dev"]
