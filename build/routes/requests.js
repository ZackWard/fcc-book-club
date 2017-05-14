"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models = require("../models");
function createRequest(req, res) {
    // Return early if user isn't authenticated
    if (!req.session.user) {
        return res.status(401).json({ message: "You must be logged in to request a book" });
    }
    let findUserPromise = models.User.findOne({ where: { username: String(req.session.user) } });
    let findBookPromise = models.BookCopy.findOne({ where: { id: Number(req.params.bookId) }, include: [{ model: models.User, attributes: ['username'] }] });
    Promise.all([findUserPromise, findBookPromise])
        .then(([user, book]) => {
        if (user.username == book.user.username) {
            // This user is requesting to borrow their own book. This should result in an error
            return Promise.reject({ code: 403, message: "You own this book, and so cannot request to borrow it." });
        }
        let newRequest = models.LoanRequest.build({ status: "requested" });
        newRequest.setUser(user, { save: false });
        newRequest.setBookCopy(book, { save: false });
        return newRequest.save();
    })
        .then(savedRequest => {
        res.json(savedRequest);
    })
        .catch(error => {
        return res.status(error.code).json({ message: error.message });
    });
}
exports.createRequest = createRequest;
;
function getRequests(req, res) {
    let queryInclusions = [models.User, { model: models.LoanRequest, include: [models.User] }];
    models.BookCopy.findOne({ where: { id: Number(req.params.bookId) }, include: queryInclusions })
        .then(book => {
        if (book == null) {
            return Promise.reject({ code: 404, message: "Book not found" });
        }
        if (book.user.username != req.session.user) {
            return res.json({ requests: book.loanRequests.length });
        }
        else {
            let results = book.loanRequests.map(bookRequest => {
                return {
                    id: bookRequest.id,
                    created: bookRequest.createdAt,
                    updated: bookRequest.updatedAt,
                    status: bookRequest.status,
                    username: bookRequest.user.username,
                    firstName: bookRequest.user.firstName,
                    lastName: bookRequest.user.lastName,
                    city: bookRequest.user.city,
                    state: bookRequest.user.state
                };
            });
            return res.json({ requests: results });
        }
    })
        .catch(error => {
        return res.status(error.code).json({ message: error.message });
    });
}
exports.getRequests = getRequests;
;
function modifyRequest(req, res) {
    if (!req.session.user) {
        return res.status(403).json({ error: "You must be logged in to modify a loan request" });
    }
    // Return early for invalid actions
    let requestedAction = String(req.body.action).toLowerCase();
    let validActions = ["approve", "decline", "return"];
    if (validActions.indexOf(requestedAction) == -1) {
        return res.status(401).json({ message: "Invalid action" });
    }
    let queryInclusions = [models.User, { model: models.BookCopy, include: [models.User] }];
    models.LoanRequest.findOne({ where: { id: Number(req.params.requestId), bookCopyId: Number(req.params.bookId) }, include: queryInclusions })
        .then(verifyRequestFound)
        .then(verifyRequestOwnership)
        .then(verifyRequestStatus)
        .then(makeRequestModification)
        .then(saveModifiedRequest)
        .catch(error => {
        return res.status(error.code).json({ error: error.message });
    });
    function saveModifiedRequest([bookRequest, message]) {
        return bookRequest.save().then(() => { res.json({ message: message }); }).catch(err => res.status(500).json(err));
    }
    ;
    function makeRequestModification(bookRequest) {
        if (bookRequest.status == "requested" && requestedAction == "approve") {
            bookRequest.bookCopy.status = "unavailable";
            bookRequest.status = "lent";
            return [bookRequest, "Request approved"];
        }
        else if (bookRequest.status == "requested" && requestedAction == "decline") {
            bookRequest.status = "declined";
            return [bookRequest, "Request declined"];
        }
        else if (bookRequest.status == "lent" && requestedAction == "return") {
            bookRequest.bookCopy.status = "available";
            bookRequest.status = "returned";
            return [bookRequest, "Book returned"];
        }
        else {
            return [bookRequest, "Request not modified"];
        }
    }
    ;
    function verifyRequestFound(bookRequest) {
        if (bookRequest == null) {
            return Promise.reject({ code: 404, message: "That request was not found" });
        }
        else {
            return bookRequest;
        }
    }
    ;
    function verifyRequestOwnership(bookRequest) {
        if (req.session.user != bookRequest.bookCopy.user.username) {
            return Promise.reject({ code: 403, message: "You do not have permission to modify that loan request" });
        }
        else {
            return bookRequest;
        }
    }
    ;
    function verifyRequestStatus(bookRequest) {
        if (bookRequest.status == "declined" || bookRequest.status == "returned") {
            return Promise.reject({ code: 403, message: "This loan request cannot be modified" });
        }
        else {
            return bookRequest;
        }
    }
    ;
}
exports.modifyRequest = modifyRequest;
;
function deleteRequest(req, res) {
}
exports.deleteRequest = deleteRequest;
;
