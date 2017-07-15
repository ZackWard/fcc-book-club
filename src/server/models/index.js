import * as path from "path";
import * as Sequelize from "sequelize";
import config from "../config";

let dbFileName = config.dbFileName;

console.log("Database filename: " + dbFileName);

let dbPath = path.resolve(__dirname, '..', dbFileName);

var sequelize = new Sequelize("database", null, null, { dialect: 'sqlite', storage: dbPath, logging: false });

var db = {};

// Define Models
db.User = sequelize.import(path.join(__dirname, 'User.js'));
db.Book = sequelize.import(path.join(__dirname, 'Book.js'));
db.BookCopy = sequelize.import(path.join(__dirname, "BookCopy.js"));
db.TradeRequest = sequelize.import(path.join(__dirname, 'TradeRequest.js'));
db.TradeRecord = sequelize.import(path.join(__dirname, "TradeRecord.js"));

// Build model associations
db.User.associate(db);
db.Book.associate(db);
db.BookCopy.associate(db);
db.TradeRequest.associate(db);
db.TradeRecord.associate(db);

db.Sequelize = Sequelize;
db.sequelize = sequelize;

module.exports = db;