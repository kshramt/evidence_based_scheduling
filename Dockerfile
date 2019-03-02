from node:11.9.0-alpine

run apk add --no-cache \
      python3 \
      py3-pip

workdir /app

copy requirements.txt .
run pip3 install --no-cache-dir -r requirements.txt

copy package.json package-lock.json .
run npm ci

copy . .
run npm run build \
&& rm -fr \
      node_modules \
      requirements.txt \
      package-lock.json \
      package.json \
      public \
      src


expose 5000
cmd EBS_DATA_DIR=data FLASK_ENV=deployment python3 server.py
