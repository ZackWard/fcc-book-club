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
        console.log("Got user and book!");
        console.log("Created: " + created);
        let newCopy = models.BookCopy.build({ available: true });
        newCopy.setUser(user, { save: false });
        newCopy.setBook(book, { save: false });
        return newCopy.save();
    })
        .then(copy => {
        console.log("Added book to user.");
        return res.json({ message: "Added book!", data: copy });
    })
        .catch(error => console.log(error));
}
exports.createBook = createBook;
;
function getBooks(req, res) {
    // Get a list of all of the available books in the system
    models.BookCopy.findAll({ where: { available: true }, include: [models.User, models.Book] }).then(books => {
        console.log(JSON.stringify(books));
        let filteredBooks = books.map(book => {
            console.log(JSON.stringify(book));
            return {
                id: Number(book.id),
                available: Boolean(book.available),
                user: {
                    username: book.user.username,
                    firstName: book.user.firstName,
                    lastName: book.user.lastName,
                    city: book.user.city,
                    state: book.user.state,
                },
                title: book.book.title,
                subtitle: book.book.subtitle,
                authors: book.book.authors,
                description: book.book.description,
                image: book.book.image
            };
        });
        return res.json(filteredBooks);
    });
}
exports.getBooks = getBooks;
;
function deleteBook(req, res) {
    models.BookCopy.findOne({ where: { id: req.params.bookId }, include: [{ model: models.User, attributes: ['username'] }] })
        .then(book => {
        console.log("Deleting a book");
        console.log(JSON.stringify(book));
        // Only delete the book if the currently logged in user is the owner
        if (req.session.user === book.user.username) {
            return book.destroy();
        }
        else {
            return Promise.reject(new Error("You cannot delete a book that you do not own."));
        }
    })
        .then(() => res.json({ message: "Book deleted!" }))
        .catch(error => res.status(500).json({ error: error.toString() }));
}
exports.deleteBook = deleteBook;
;
