FROM node:20-slim

WORKDIR /app

# Install netcat and OpenSSL for database connection check and Prisma
RUN apt-get update && apt-get install -y netcat-openbsd openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy the rest of the application
COPY . .

# Make the initialization script executable
COPY scripts/init.sh /init.sh
RUN chmod +x /init.sh

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

EXPOSE 3000

CMD ["/init.sh"] 