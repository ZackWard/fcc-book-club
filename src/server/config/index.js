import * as dotenv from "dotenv";
dotenv.config();

export default {
    cookieSecret: process.env.APP_SECRET,
    dbFileName: (process.env.NODE_ENV == "testing") ? "bookclub.test.db" : "bookclub.db"
};