"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const express = require("express");
const utils = require("./utils");
const userRoutes = require("./users");
const bookRoutes = require("./books");
const requestRoutes = require("./requests");
const router = express.Router();
const rejectNonJSON = utils.rejectNonJSON;
const parseJSON = bodyParser.json();
/**
 * User Routes
 */
router.route('/api/users')
    .post(rejectNonJSON, parseJSON, userRoutes.createUser);
router.route('/api/users/login')
    .post(rejectNonJSON, parseJSON, userRoutes.login);
router.route('/api/users/logout')
    .get(userRoutes.logout);
router.route('/api/users/:username')
    .get(userRoutes.getUser)
    .patch(rejectNonJSON, parseJSON, userRoutes.updateUser);
router.route('/api/users/:username/books')
    .get(userRoutes.getUserBooks);
/**
 * Book Routes
 */
router.route('/api/books')
    .get(bookRoutes.getBooks)
    .post(rejectNonJSON, parseJSON, bookRoutes.createBook);
router.route('/api/books/:bookId')
    .patch(rejectNonJSON, parseJSON, bookRoutes.editBook)
    .delete(rejectNonJSON, parseJSON, bookRoutes.deleteBook);
router.route('/api/books/:bookId/requests')
    .get(rejectNonJSON, parseJSON, requestRoutes.getRequests)
    .post(rejectNonJSON, parseJSON, requestRoutes.createRequest);
router.route('/api/boooks/:bookId/requests/:requestId')
    .patch(rejectNonJSON, parseJSON, requestRoutes.getRequests)
    .delete(rejectNonJSON, parseJSON, requestRoutes.deleteRequest);
exports.default = router;
