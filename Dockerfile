FROM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
# Build dengan DB in-memory. `next build` menjalankan beberapa worker yang
# masing-masing meng-import modul `db` (src/lib/db/index.ts) di top-level →
# membuka koneksi SQLite. Jika pakai file yang sama, worker berebut lock dan
# gagal dengan SQLITE_BUSY. :memory: membuat tiap worker punya DB sendiri.
# Env ini hanya di stage builder; runner tidak mewarisinya, jadi runtime
# tetap memakai DATABASE_PATH dari .env (./data/cloudmail.db).
ENV DATABASE_PATH=":memory:"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy better-sqlite3 native bindings
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

# Copy drizzle and seed dependencies
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/nanoid ./node_modules/nanoid
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src/lib/db ./src/lib/db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

RUN mkdir -p /app/data

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
