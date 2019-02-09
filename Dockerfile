from node:11.9.0-alpine

workdir /app
copy . .


run apk add --no-cache \
      python3 \
      py3-pip \
&& pip3 install -r requirements.txt \
&& npm ci \
&& npm run build \
&& rm -fr \
      node_modules \
      requirements.txt \
      package-lock.json \
      package.json \
      public \
      src


expose 5000
cmd EBS_DATA_DIR=data FLASK_ENV=deployment python3 server.py
