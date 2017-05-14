"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models = require("../models");
function createBook(req, res) {
    // Return early if no user logged in
    if (!req.session.user) {
        return res.status(403).json({ error: "You must be logged in to add a book" });
    }
    // First, check to see if we already have this book in the database
    let defaultBook = {
        google_id: String(req.body.id),
        title: String(req.body.title),
        subtitle: String(req.body.subtitle) == "null" ? null : String(req.body.subtitle),
        authors: String(req.body.authors),
        description: String(req.body.description),
        image: String(req.body.image)
    };
    let getUserPromise = models.User.findOne({ where: { username: String(req.session.user) } });
    let getBookPromise = models.Book.findOrCreate({ where: { google_id: req.body.id }, defaults: defaultBook });
    Promise.all([getUserPromise, getBookPromise])
        .then(([user, [book, created]]) => {
        let newCopy = models.BookCopy.build({ available: true });
        newCopy.setUser(user, { save: false });
        newCopy.setBook(book, { save: false });
        return newCopy.save();
    })
        .then(copy => {
        return res.json({ message: "Added book!", data: copy });
    })
        .catch(error => console.log(error));
}
exports.createBook = createBook;
;
function getBooks(req, res) {
    let whereFilter = {};
    if (req.query.owner)
        whereFilter.username = String(req.query.owner);
    let included = [
        {
            model: models.User,
            attributes: ['username'],
            where: whereFilter
        },
        {
            model: models.Book,
            attributes: ['title', 'subtitle', 'authors', 'description', 'image'],
        },
        {
            model: models.LoanRequest,
            include: [models.User]
        }
    ];
    models.BookCopy.findAll({ include: included }).then(books => {
        // Here, we need to filter the Loan Requests if the user has requested that they be included. 
        // If the user is the owner of the book, we'll include the full Loan Request information.
        // If the user is not the owner of the book, we'll only include non-private information
        let results = books.map(book => {
            let transformedBook = {
                id: book.id,
                title: book.book.title,
                subtitle: book.book.subtitle,
                authors: book.book.authors,
                description: book.book.description,
                image: book.book.image,
                available: book.available,
                owner: book.user.username,
            };
            if (req.query.includeRequests) {
                transformedBook.requests = (transformedBook.owner == req.session.user) ? getOwnerRequests(book.loanRequests) : getNonOwnerRequests(book.loanRequests);
            }
            let requestedByCurrentUser = false;
            book.loanRequests.forEach(loanRequest => {
                if (loanRequest.user.username == req.session.user && loanRequest.status == "requested") {
                    requestedByCurrentUser = true;
                }
            });
            transformedBook.requestedByCurrentUser = requestedByCurrentUser;
            return transformedBook;
        });
        return res.json(results);
    });
    function getOwnerRequests(requests) {
        if (!Array.isArray(requests))
            return [];
        return requests;
    }
    function getNonOwnerRequests(requests) {
        if (!Array.isArray(requests))
            return 0;
        return requests.reduce((acc, request) => acc + 1, 0);
    }
}
exports.getBooks = getBooks;
;
function editBook(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: "You must be logged in to edit a book" });
    }
    models.BookCopy.findOne({ where: { id: req.params.bookId }, include: [{ model: models.User, attributes: ['username'] }] })
        .then(book => {
        if (req.session.user != book.user.username) {
            return res.status(401).json({ error: "You do not have permission to edit that book." });
        }
        else {
            book.available = Boolean(req.body.available);
            return book.save().then(savedBook => res.json(savedBook));
        }
    })
        .catch(err => res.status(404).json({ error: "Book not found" }));
}
exports.editBook = editBook;
;
function deleteBook(req, res) {
    models.BookCopy.findOne({ where: { id: req.params.bookId }, include: [{ model: models.User, attributes: ['username'] }] })
        .then(book => {
        // Only delete the book if the currently logged in user is the owner
        if (req.session.user === book.user.username) {
            console.log("User owns the book. Deleting it.");
            return book.destroy().then(() => res.json({ message: "Book deleted" }));
        }
        else {
            return res.status(401).json({ error: "You do not have permission to delete this book." });
        }
    })
        .catch(error => res.status(404).json({ error: "Book not found." }));
}
exports.deleteBook = deleteBook;
;
