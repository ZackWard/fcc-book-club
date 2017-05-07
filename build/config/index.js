"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
exports.default = {
    cookieSecret: process.env.APP_SECRET,
    dbFileName: (process.env.NODE_ENV == "testing") ? "bookclub.test.db" : "bookclub.db"
};
