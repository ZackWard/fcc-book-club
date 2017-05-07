import * as path from "path";
import * as express from "express";
import * as helmet from "helmet";
import * as csurf from "csurf";
import * as session from "express-session";
import * as cons from "consolidate";
import config from "./config";

import * as models from "./models";
import routes from "./routes";

// Set up all of our session handling middleware
let SequelizeStore = require('connect-session-sequelize')(session.Store);
let sessionStore = new SequelizeStore({ db: models.sequelize });
sessionStore.sync();

let port = 3008;

let app = express();

// App Settings
app.engine('html', cons.mustache);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, "..", "views"));

// Set up middleware
let csrfProtection = csurf();
app.use(helmet());
app.use(session({
  secret: config.cookieSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false
}));
app.use('/static', express.static('public'));
app.use(routes);

// CSRF Error Handling middleware
app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  res.status(403);
  res.end("Cross Site Request Forgery Detected!");
});

app.get('*', csrfProtection, function (req, res) {
  res.render('index', {
    'csrf-token': req.csrfToken()
  });
});

// Make sure that database is up and synchronized, then start server
models.sequelize.sync().then(function () {
  app.listen(port, function () {
    console.log('Example app listening on port ' + port + '!');
  });
});

// Export Express app so that it can be used in tests
module.exports = {
  server: app,
  models: models,
  session: sessionStore
};