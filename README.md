# Evidence Based Scheduling

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

### `npm test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment
