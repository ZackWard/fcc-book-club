import * as path from "path";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as utils from "./utils";

import * as userRoutes from "./users";
import * as bookRoutes from "./books";
import * as requestRoutes from "./requests";

const router = express.Router();
const rejectNonJSON = utils.rejectNonJSON;
const requireAuthentication = utils.requireAuthentication;
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

router.route('/api/users/:username/records')
    .get(userRoutes.getUserRecords);

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

router.route('/api/books/:bookId/requests/:requestId')
    .delete(rejectNonJSON, parseJSON, requireAuthentication, requestRoutes.deleteRequest)
    .post(rejectNonJSON, parseJSON, requestRoutes.approveRequest);

export default router;