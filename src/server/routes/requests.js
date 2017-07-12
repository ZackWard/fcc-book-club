import * as models from "../models";

export function createRequest(req, res) {
    // Return early if user isn't authenticated
    if (! req.session.user) {
        return res.status(401).json({message: "You must be logged in to request a book"});
    }

    let findUserPromise = models.User.findOne({where: { username: String(req.session.user) }, include: [ { model: models.BookCopy, attributes: [ 'id' ] } ] });
    let findBookPromise = models.BookCopy.findOne({where: { id: Number(req.params.bookId) }, include: [ { model: models.User, attributes: [ 'username' ] } ]});
    Promise.all([findUserPromise, findBookPromise])
    .then(([user, book]) => {
        
        // If the user making the request hasn't offered any books in exchange, bail
        if ( ! Array.isArray(req.body.booksOffered)) {
            return Promise.reject({code: 403, message: "Field 'booksOffered' must be an array of integers"});
        }

        // Filter the list of the books that user owns. Exlude any that were not offered.
        let booksOffered = user.bookCopies.filter(bookCopy => {
            return req.body.booksOffered.indexOf(bookCopy.id) !== -1;
        });
        if (booksOffered.length < 1) {
            return Promise.reject({code: 403, message: "You must offer at least 1 book in exchange if you would like to make a trade request."});
        }

        if (user.username == book.user.username) {
            // This user is requesting to borrow their own book. This should result in an error
            return Promise.reject({code: 403, message: "You cannot trade with yourself. This is a book that you already own."});
        }

        return buildRequest("pending", user, book, booksOffered);
    })
    .then(([savedRequest, savedBooksOffered]) => {
        console.log("----------------------");
        console.log(JSON.stringify(savedRequest, null, 2));
        console.log(JSON.stringify(savedBooksOffered, null, 2));
        res.json(savedRequest);
    })
    .catch(error => {
        return res.status(error.code).json({message: error.message});
    });

    const buildRequest = function (status, user, book, booksOffered) {
        return new Promise(function (resolve, reject) {
            let savedRequest;
            let newRequest = models.TradeRequest.build({status: status});
            newRequest.setUser(user, {save: false});
            newRequest.setBookCopy(book, {save: false});
            newRequest.save()
            .then(savedReq => {
                savedRequest = savedReq;
                return savedRequest.setBooksOffered(booksOffered);
            })
            .then(() => {
                return savedRequest.getBooksOffered();
            })
            .then((savedBooksOffered) => {
                resolve([savedRequest, savedBooksOffered]);
            })
            .catch(error => reject(error));
        });
    };
};

export function getRequests(req, res) {
    let queryInclusions = [ models.User, { model: models.TradeRequest, include: [ models.User ] } ];
    models.BookCopy.findOne({where: { id: Number(req.params.bookId) }, include: queryInclusions })
    .then(book => {
        if (book == null) {
            return Promise.reject({code: 404, message: "Book not found"});
        }

        // If the current user is the owner of the book, return a detailed list of requests.
        // Otherwise, return the current number of requests for that book
        if (book.user.username != req.session.user) {
            return res.json({requests: book.tradeRequests.length });
        } else {
            let results = book.tradeRequests.map(bookRequest => {
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
            return res.json({requests: results});
        }
    })
    .catch(error => {
        return res.status(error.code).json({message: error.message});
    });
};

export function approveRequest(req, res) {
    if ( ! req.session.user) {
        return res.status(403).json({error: "You must be logged in to approve a trade request."});
    }

    let queryInclusions = [ 
        {
            model: models.User, 
            attributes: ["username", "firstName", "lastName", "city", "state"]
        },
        { 
            model: models.BookCopy, 
            include: [ 
                {
                    model: models.Book
                },
                {
                    model: models.User,
                    attributes: ["username", "firstName", "lastName", "city", "state"]
                }
            ] 
        }
    ];

    models.TradeRequest.findOne({where: { id: Number(req.params.requestId), bookCopyId: Number(req.params.bookId) }, include: queryInclusions })
    .then(verifyRequestFound)
    .then(verifyPermission)
    .then(verifyExchange)
    .then(approveTradeRequest)
    .then(saveModifiedRequest)
    .catch(error => {
        console.log(error);
        return res.status(error.code).json({message: error.message})
    });

    function verifyRequestFound(bookRequest) {
        if (bookRequest == null) {
            return Promise.reject({code: 404, message: "That request was not found"});
        } else {
            return bookRequest;
        }
    };

    function verifyPermission(bookRequest) {
        if (req.session.user == bookRequest.bookCopy.user.username) {
            return bookRequest;
        } else {
            return Promise.reject({code: 403, message: "You do not have permission to approve that trade request."});
        }
    };

    function verifyExchange(bookRequest) {
        // The request should have a JSON field named "exchangedBook" that refers to a BookCopy that is available, and that is owned by the user who made the trade request
        return new Promise(function (resolve, reject) {
            if (typeof req.body.exchangedBook != "number") {
                return reject({ code: 400, message: "The exchangedBook field must contain an integer."});
            }
            models.bookCopy.findOne({where: {id: req.body.exchangedBook}, include: [ { model: models.User, attributes: ['username'] } ] })
            .then(exchangedBook => {
                console.log("Exchanged book:");
                console.log(JSON.stringify(exchangedBook, null, 2));
                
            })
            .catch(error => reject({code: 999, message: error}));
        });
    };

    function approveTradeRequest(bookRequest) {
        return [bookRequest, "Testing!"];
    };

    function saveModifiedRequest([bookRequest, message]) {
        return bookRequest.save().then(() => {res.json({message: message})}).catch(err => res.status(500).json(err));
    };
};

export function deleteRequest(req, res) {

};