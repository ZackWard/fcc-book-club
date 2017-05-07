"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const csurf = require("csurf");
const session = require("express-session");
const dotenv = require("dotenv");
const cons = require("consolidate");
const setupDB_js_1 = require("./setupDB.js");
dotenv.config();
const models = require("./models");
const routes_1 = require("./routes");
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
    secret: process.env.APP_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false
}));
app.use('/static', express.static('public'));
app.use(routes_1.default);
// CSRF Error Handling middleware
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN')
        return next(err);
    res.status(403);
    res.end("Cross Site Request Forgery Detected!");
});
app.get('*', csrfProtection, function (req, res) {
    res.render('index', {
        'csrf-token': req.csrfToken()
    });
});
// Test DB Stuff
let dropDB = true;
setupDB_js_1.default(models, dropDB);
// Make sure that database is up and synchronized, then start server
models.sequelize.sync().then(function () {
    app.listen(port, function () {
        console.log('Example app listening on port ' + port + '!');
    });
});
// Export Express app so that it can be used in tests
module.exports = {
    server: app,
    models: models
};
