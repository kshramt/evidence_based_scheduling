# Evidence Based Scheduling

## Usage

```
./build.sh
docker run --rm -p 5000:5000 -v "$(pwd)":/app/data kshramt/evidence_based_scheduling
# open localhost:5000 in a Web browser
```

## Development

```
python3 -m  venv venv
source venv/bin/activate
pip3 install -r requirements.txt
npm ci

EBS_DATA_DIR=. FLASK_APP=server.py FLASK_DEBUG=1 flask run
# On another terminal window.
npm start # http://localhost:3000
```

## License

GNU General Public License version 3.
