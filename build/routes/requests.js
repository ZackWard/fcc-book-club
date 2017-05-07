"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const utils = require("./utils");
let rejectNonJSON = utils.rejectNonJSON;
let parseJSON = bodyParser.json();
const router = express.Router();
router.post('/', rejectNonJSON, parseJSON, function (req, res) {
    console.log("-------------------------------------");
    console.log(req.session.user);
    console.log("-------------------------------------");
    if (req.session.user == undefined) {
        return res.status(401).json({ error: "You must be logged in to request a book." });
    }
    res.json({ message: "POST /api/requests" });
});
router.get('/:requestid', function (req, res) {
    res.json({ message: "GET /api/requests/[request_id]" });
});
router.put('/:requestid', function (req, res) {
    res.json({ message: "PUT /api/requests/[request_id]" });
});
exports.default = router;
