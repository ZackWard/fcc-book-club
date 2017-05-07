"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = require("bcrypt");
const models = require("../models");
let saltRounds = 10;
function hashPassword(password) {
    return new Promise(function (resolve, reject) {
        bcrypt.hash(password, saltRounds, function (err, hash) {
            if (err)
                return reject(err);
            resolve(hash);
        });
    });
}
;
function login(req, res) {
    models.User.findOne({ where: { username: String(req.body.username) } }).then(function (user) {
        if (user == null) {
            return res.status(400).json({ error: "Invalid username or password" });
        }
        else {
            bcrypt.compare(String(req.body.password), user.password, function (err, result) {
                if (err || result == false) {
                    return res.status(400).json({ error: "Invalid username or password" });
                }
                else {
                    req.session.user = user.username;
                    res.json({ message: "Logged in!" });
                }
            });
        }
    });
}
exports.login = login;
;
function logout(req, res) {
    req.session.destroy(error => {
        if (error)
            return res.status(500).json({ error: error.toString() });
        res.json({ message: "Logged out!" });
    });
}
exports.logout = logout;
;
function createUser(req, res) {
    let newUser = {
        username: String(req.body.username),
        password: ''
    };
    hashPassword(String(req.body.password))
        .then(hash => {
        newUser.password = hash;
        return models.User.findOrCreate(({ where: { username: newUser.username }, defaults: newUser }));
    })
        .then(([user, created]) => {
        if (!created) {
            res.status(403).json({ error: { message: "User already exists" } });
        }
        else {
            req.session.user = user.username;
            res.json({ message: "Created new user" });
        }
    })
        .catch(err => {
        return res.status(500).json({ error: "Error" });
    });
    // bcrypt.hash(String(req.body.password), saltRounds, function (err, hash) {
    //     // TODO handle error
    //     newUser.password = hash;
    //     models.User.findOrCreate({where: {username: newUser.username}, defaults: newUser }).then(function ([user, created]) {
    //         if (!created) {
    //             res.status(403).json({error: {message: "User already exists"}});
    //         } else {
    //             res.json({message: "Created new user"});
    //             req.session.user = user.username;
    //         }
    //     });
    // });
}
exports.createUser = createUser;
;
function getUser(req, res) {
    models.User.findOne({ where: { username: String(req.params.username) } })
        .then(function (user) {
        return res.json({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            city: user.city,
            state: user.state
        });
    })
        .catch(function (error) {
        console.log(error);
        return res.status(404).json({
            error: "Username not found"
        });
    });
}
exports.getUser = getUser;
;
function getUserBooks(req, res) {
    models.User.findOne({ where: { username: String(req.params.username) } })
        .then(user => {
        if (user == null) {
            return Promise.reject(new Error('User not found'));
        }
        else {
            return models.BookCopy.findAll({ where: { userId: user.id }, include: [models.Book, models.LoanRequest] });
        }
    })
        .then(books => {
        console.log(JSON.stringify(books));
        return books.map(book => {
            return {
                id: book.id,
                status: book.status,
                title: book.book.title,
                subtitle: book.book.subtitle,
                authors: book.book.authors,
                description: book.book.description,
                image: book.book.image,
                requests: book.loanRequests.map(bookRequest => bookRequest)
            };
        });
    })
        .then(books => {
        return res.json(books);
    })
        .catch(error => {
        console.log(error);
        return res.status(500).json({ error: error.toString() });
    });
}
exports.getUserBooks = getUserBooks;
function updateUser(req, res) {
    // Return early if user is not logged on, or if the request is to update any user other than the one currently logged on
    if (!req.session.user || req.session.user != String(req.params.username)) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    // Generate a new password hash if we're updating the password
    let newPasswordPromise = (req.body.password) ? hashPassword(String(req.body.password)) : Promise.resolve(false);
    let findUserPromise = models.User.findOne({ where: { username: String(req.session.user) } });
    Promise.all([findUserPromise, newPasswordPromise])
        .then(([user, newPassword]) => {
        user.firstName = req.body.first_name ? String(req.body.first_name) : user.firstName;
        user.lastName = req.body.last_name ? String(req.body.last_name) : user.lastName;
        user.city = req.body.city ? String(req.body.city) : user.city;
        user.state = req.body.state ? String(req.body.state) : user.state;
        user.password = (newPassword != false) ? newPassword : user.password;
        return user;
    })
        .then(user => {
        return user.save().then(function () {
            return res.json({
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                city: user.city,
                state: user.state
            });
        });
    })
        .catch(function (error) {
        console.log(error);
    });
}
exports.updateUser = updateUser;
;
