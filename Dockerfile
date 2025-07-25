FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Create data directory
RUN mkdir -p data/plane

# Copy custom users.json if it exists (optional)
RUN if [ -f data/users.json ]; then cp data/users.json data/plane/; fi

# Set environment variables
ENV NODE_ENV=production

# Expose port (if needed)
EXPOSE 3000

# Default command
CMD ["pnpm", "start"] 