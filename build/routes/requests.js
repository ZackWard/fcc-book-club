"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models = require("../models");
function createRequest(req, res) {
    models.Book.findOne({ where: { id: Number(req.params.bookId) } })
        .then(book => {
        console.log(JSON.stringify(book));
        res.json(book);
    })
        .catch(error => {
        res.status(500).json(error);
    });
}
exports.createRequest = createRequest;
;
function getRequests(req, res) {
}
exports.getRequests = getRequests;
;
function editRequest(req, res) {
}
exports.editRequest = editRequest;
;
function deleteRequest(req, res) {
}
exports.deleteRequest = deleteRequest;
;
