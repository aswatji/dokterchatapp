# Use Node.js 20 LTS (compatible with all dependencies)
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install utilities required at runtime (curl for healthcheck)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (use --omit=dev instead of deprecated --only=production)
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Make start script executable (before switching user)
RUN chmod +x start-caprover.sh

# Create non-root user
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser
RUN chown -R nodeuser:nodeuser /app
USER nodeuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Start application (CapRover aware script)
CMD ["./start-caprover.sh"]
