let models = require('./models');
models.sequelize.sync({ force: true }).then(function () {
    console.log("Database initialized");
});
;
