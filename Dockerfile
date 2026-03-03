FROM node:20-bullseye

# 1. Install MongoDB & Build Dependencies
RUN apt-get update && apt-get install -y gnupg wget ca-certificates libssl-dev openssl
RUN wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor | tee /usr/share/keyrings/mongodb-archive-keyring.gpg > /dev/null
RUN echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
RUN apt-get update && apt-get install -y mongodb-org

# 2. Setup Directories
WORKDIR /app
RUN mkdir -p /data/db

# 3. Install Dependencies
COPY package*.json ./
# Force optional dependencies for Linux x64 glibc
RUN npm install --include=optional

# 4. Copy Source & Build Frontend
COPY . .

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# NEXT_PUBLIC_ vars must be present at build time for Next.js to inline them
ARG NEXT_PUBLIC_RENDER_URL=http://localhost:4000
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ENV NEXT_PUBLIC_RENDER_URL=$NEXT_PUBLIC_RENDER_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# Build the app
RUN npm run build

# 5. Setup Entrypoint
RUN chmod +x scripts/entrypoint.sh

# Expose ports: 3000 (Front), 4000 (Back)
EXPOSE 3000 4000

ENTRYPOINT ["./scripts/entrypoint.sh"]
