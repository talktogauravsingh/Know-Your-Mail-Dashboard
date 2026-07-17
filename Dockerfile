FROM php:8.3-fpm-alpine

# Set working directory
WORKDIR /var/www/html

# Install mlocati's PHP extension installer to speed up extension building
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN chmod +x /usr/local/bin/install-php-extensions && \
    apk update && apk add --no-cache git zip unzip && \
    install-php-extensions pdo_pgsql pdo_mysql

# Install Composer securely from the official image
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Copy the application source code
COPY . .

# Optional: Install dependencies inside the image (uncomment for production)
# RUN composer install --no-dev --no-interaction --optimize-autoloader

# Ensure proper permissions for Laravel's cache and storage directories
RUN mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
