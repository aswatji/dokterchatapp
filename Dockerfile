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

# Create non-root user with proper shell
RUN groupadd -r nodeuser && useradd -r -g nodeuser -s /bin/bash nodeuser
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Verify setup
RUN whoami && pwd && ls -la start-caprover.sh

# Expose port (CapRover will map this to 80)
EXPOSE 3000

# Health check on correct port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application (CapRover aware script)
CMD ["./start-caprover.sh"]
