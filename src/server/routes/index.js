import * as path from "path";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as utils from "./utils";

import * as userRoutes from "./users";
import * as bookRoutes from "./books";

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
    .delete(rejectNonJSON, parseJSON, bookRoutes.deleteBook);

// router.use('/api/books', bookRoutes);

export default router;