
# Linux Alpine . ringan (~50MB)
FROM node:20-alpine

# Set Environment Variables
ENV NODE_ENV=production
ENV PORT=5000

# direktori kerja 
WORKDIR /app

# Salin file . Docker Layer Caching
COPY package*.json ./

# dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Salin source code 
COPY src ./src

# Jalankan aplikasi menggunakan user non-root 'node'
USER node

# Dokumentasikan port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# on server
CMD ["node", "src/server.js"]
