from node:13.14.0-alpine3.11 as js

workdir /app

copy package.json package-lock.json ./
run npm ci

copy . .
run npm run build


from python:3.8.3-alpine3.11 as py

workdir /app

copy requirements.txt .
run pip install --no-cache-dir -r requirements.txt \
&& rm -fr requirements.txt

copy --from=js /app/build build

copy server.py .

expose 5000
cmd EBS_DATA_DIR=data FLASK_ENV=deployment python3 server.py
