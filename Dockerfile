# Use a single base image that meets all requirements
FROM node:16

# Set environment variables
ENV PATH /usr/local/bin:$PATH
ENV PYTHON_VERSION 3.11.0
ENV PYTHON_SHA256 a57dc82d77358617ba65b9841cee1e3b441f386c3789ddc0676eca077f2951c3

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libbluetooth-dev \
    tk-dev \
    uuid-dev \
    libssl-dev \
    zlib1g-dev \
    libffi-dev \
    libsqlite3-dev \
    libreadline-dev \
    libncursesw5-dev \
    libbz2-dev \
    liblzma-dev \
    libgdbm-dev \
    libgdbm-compat-dev \
    libmpdec-dev \
    libwebp-dev \
    libexpat1-dev \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    libx11-dev \
    libxtst-dev \
    libxext-dev \
    libxrender-dev \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    libxi-dev \
    libgles2-mesa-dev \
    libxkbcommon-dev \
    libwayland-dev \
    libxrandr-dev \
    libvulkan-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download and install Python
RUN set -eux; \
    wget -O python.tar.xz "https://www.python.org/ftp/python/${PYTHON_VERSION%%[a-z]*}/Python-$PYTHON_VERSION.tar.xz"; \
    echo "$PYTHON_SHA256 *python.tar.xz" | sha256sum -c -; \
    mkdir -p /usr/src/python; \
    tar --extract --directory /usr/src/python --strip-components=1 --file python.tar.xz; \
    rm python.tar.xz; \
    cd /usr/src/python; \
    gnuArch="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)"; \
    ./configure \
        --build="$gnuArch" \
        --enable-loadable-sqlite-extensions \
        --enable-optimizations \
        --enable-option-checking=fatal \
        --enable-shared \
        --with-lto \
        --with-ensurepip \
    ; \
    nproc="$(nproc)"; \
    make -j "$nproc"; \
    make install; \
    ldconfig; \
    find /usr/local -depth \
        \( \
            \( -type d -a \( -name test -o -name tests -o -name idle_test \) \) \
            -o \( -type f -a \( -name '*.pyc' -o -name '*.pyo' -o -name 'libpython*.a' \) \) \
        \) -exec rm -rf '{}' + \
    ; \
    python3 --version; \
    pip3 --version

# Create symlinks for Python
RUN set -eux; \
    for src in idle3 pip3 pydoc3 python3 python3-config; do \
        dst="$(echo "$src" | tr -d 3)"; \
        [ -s "/usr/local/bin/$src" ]; \
        [ ! -e "/usr/local/bin/$dst" ]; \
        ln -svT "$src" "/usr/local/bin/$dst"; \
    done

# Set working directory
WORKDIR /app

# Install Node.js dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["yarn", "start"]