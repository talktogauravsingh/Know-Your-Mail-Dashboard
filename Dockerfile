FROM php:8.3-fpm-alpine

# Set working directory
WORKDIR /var/www/html

# Install essential system dependencies and PHP extensions
# Added postgresql-dev for pdo_pgsql since .env uses PostgreSQL
RUN apk update && apk add --no-cache \
    postgresql-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    linux-headers \
    $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_pgsql gd zip pcntl \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS \
    && rm -rf /var/cache/apk/*

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
