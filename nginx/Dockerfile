FROM nginx:alpine

# Remove default configuration and copy custom configuration
RUN rm /etc/nginx/conf.d/default.conf || true
COPY ./nginx.conf /etc/nginx/nginx.conf

# Expose HTTP port
EXPOSE 80
