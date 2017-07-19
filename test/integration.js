var cookie = require('cookie');
var signature = require('cookie-signature');
var mocha = require('mocha');
var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../build/book-club-server');
var config = require('../build/config').default;
var newFixtures = require('./fixtures.json');

chai.use(chaiHttp);

let expect = chai.expect;
let server = app.server;
let db = app.models;
let session = app.session;

let fixtures = {};

// We'll use an agent so that when we login, cookies will be saved and reused with the next request
let agent = chai.request.agent(server);

// We'll use this helper function to make our http calls to the API
function makeRequest(method, url, useAgent = false, payload = false) {
    return new Promise(function (resolve, reject) {
        let target = ( useAgent ? agent : chai.request(server) );
        let request = ( payload ? target[method](url).send(payload).type('json') : target[method](url).type('json') );
        request
        .then(res => {
            resolve(res);
        })
        .catch(({ response }) => {
            resolve(response)
        });
    });
};

async function makeAuthenticatedRequest(method, url, useAgent = true, payload = false) {
    try {
        await authenticateUser();
    }
    catch (e) {
        throw new Error(e);
    }
    return makeRequest(method, url, true, payload);
}

async function buildUsers(fixtures) {
    for (var user in fixtures.users) {
        try {
            fixtures.users[user] = await db.User.create(fixtures.users[user]);
        }
        catch (e) {
            throw new Error(e);
        }
    }
    return fixtures;
}

async function buildBooks(fixtures) {
    for (var book in fixtures.books) {
        try {
            fixtures.books[book] = await db.Book.create(fixtures.books[book]);
        } 
        catch (e) {
            throw new Error(e);
        }
    }
    return fixtures;
}

async function buildBookCopies(fixtures) {
    for (var bookcopy in fixtures.bookcopies) {
        let thisCopy = fixtures.bookcopies[bookcopy];
        let newBookCopy = db.BookCopy.build({});
        newBookCopy.setUser(fixtures.users[thisCopy.user].id, {save: false});
        newBookCopy.setBook(fixtures.books[thisCopy.book].id, {save: false});
        try {
            fixtures.bookcopies[bookcopy] = await newBookCopy.save();
        }
        catch (e) {
            throw new Error(e);
        }
    }
    return fixtures;
}

async function buildRequests(fixtures) {

    for (var request in fixtures.requests) {
        let thisRequest = fixtures.requests[request];
        let newRequest = db.TradeRequest.build({status: "requested"});
        newRequest.setUser(fixtures.users[thisRequest.user].id, {save: false});
        newRequest.setBookCopy(fixtures.bookcopies[thisRequest.bookcopy].id, {save: false});
        try {
            newRequest = await newRequest.save();
        }
        catch (e) {
            throw new Error(e);
        }
        let booksOffered = thisRequest.booksoffered.map(bookoffered => fixtures.bookcopies[bookoffered].id);
        try {
            await newRequest.setBooksOffered(booksOffered);
        }
        catch (e) {
            throw new Error(e);
        }
        
        fixtures.requests[request] = newRequest;
    }

    return fixtures;
}

function resetDatabase(logging = false) {
    console.log("Resetting database!");
    return new Promise(function (resolve, reject) {
        db.sequelize.sync({force: true, logging})
        .then(() => JSON.parse(JSON.stringify(newFixtures)))
        .then(buildUsers)
        .then(buildBooks)
        .then(buildBookCopies)
        .then(buildRequests)
        .then(resetFixtures => {
            console.log("Database reset!");
            fixtures = resetFixtures;
            return resolve(resetFixtures)
        })
        .catch(error => reject(error));
    });
}

async function authenticateUser() {
    let payload = {username: "fakeuser1", password: "password"};
    let response;
    try {
        response = await makeRequest('post', '/api/users/login', true, payload);
    }
    catch (e) {
        throw new Error(e);
    }
    return response;
}

describe("API Integration Tests", function () {

    describe("Create a new user", function () {

        let userData = {
            username: 'zack2',
            password: 'zack2'
        };

        before(function () {
            return resetDatabase();
        });

        describe("When given a valid username and password", function () {

            before(function () {
                return makeRequest('post', '/api/users', true, userData).then(res => this.res = res);
            });

            it("Should return a status 200", function () {
                expect(this.res).to.have.status(200);
            });
            
            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should actually create a new user in the database", function () {
                return db.User.findOne({where: { username: userData.username } })
                .then(user => {
                    expect(user).not.to.be.null;
                });
            });

        });

        describe("When attempting to register a username that already exists", function () {

            before(function () {
                return makeRequest('post', '/api/users', false, userData).then(res => this.res = res);
            });

            it("Should return a status 403 Forbidden", function () {
                expect(this.res).to.have.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });
        });
    });

    describe("Logout", function () {

        before(function () {
            return makeRequest('get', '/api/users/logout', true, false).then(res => this.res = res);
        });

        it("Should return a status 200", function () {
            expect(this.res).to.be.status(200);
        });

        it("Should return a JSON object", function () {
            expect(this.res).to.be.json;
        });

        it("Should not return a cookie", function () {
            expect(this.res.header['set-cookie']).to.be.equal(undefined);
        });
    });

    describe("Login", function () {

        before(function () {
            return resetDatabase();
        });

        describe("When given an invalid username and/or password", function () {

            let payload = {username: "fakeuser1", password: "incorrect"};

            before(function () {
                return makeRequest('post', '/api/users/login', false, payload).then(res => this.res = res);
            });

            it("Should return a status 400", function () {
                expect(this.res).to.have.a.status(400);
            });
        });

        describe("When provided with a valid username and password", function () {

            let payload = {username: "fakeuser1", password: "password"};

            before(function () {
                // Use the chai-http agent, so that cookies will be preserved for future requests
                return makeRequest('post', '/api/users/login', true, payload).then(res => this.res = res);
            });

            it("Should respond with a status 200", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should have a cookie with the key: connect.sid", function () {
                expect(this.res).to.have.a.cookie('connect.sid');
            });

            it("Should be a cookie that we can unsign with our cookie secret", function () {
                let cookies = cookie.parse(String(this.res.header['set-cookie']));
                let sid = cookies['connect.sid'].slice(2);
                this.sessionId = signature.unsign(sid, config.cookieSecret);
                expect(this.sessionId).not.to.be.false;
            });

            it("Should set the username in our session database to the correct username", function (done) {
                session.get(this.sessionId, function (error, ses) {
                    if (error) return done(error);
                    if (ses == null) return done(new Error("No session found"));
                    expect(ses.user).to.equal(payload.username);
                    done();
                });
            });
        });
    });

    describe("Update a user's profile and password ", function () {

        before(function () {
            return resetDatabase();
        });

        let updateData = { first_name: "Zachary", last_name: "Ward", password: "zack3", city: "Monte Vista", state: "Colorado" };

        describe("When authenticated, and attemtping to update your own account", function () {

            before(function () {
                return authenticateUser()
                    .then(() => makeRequest('patch', '/api/users/fakeuser1', true, updateData))
                    .then(res => this.res = res);
            });

            it("Should return a status 200", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should actually change the user's information in the database", function () {
                return fixtures.users.fakeuser1.reload().then(() => {
                    expect(fixtures.users.fakeuser1.firstName).to.equal(updateData.first_name);
                    expect(fixtures.users.fakeuser1.lastName).to.equal(updateData.last_name);
                    expect(fixtures.users.fakeuser1.city).to.equal(updateData.city);
                    expect(fixtures.users.fakeuser1.state).to.equal(updateData.state);
                });
            });
        });

        describe("When attempting to update an account that you aren't authenticated on", function () {

            before(function () {
                // agent is authenticated on zack2, attempting to update account zack
                return makeRequest('patch', '/api/users/zack', true, updateData).then(res => this.res = res);
            });

            it('Should return a status 403 unauthorized response', function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });
        });
    });

    describe("Create a new book", function () {

        let newBook = {
            id: "google_id",
            title: "Book One",
            subtitle: "This is a test book",
            authors: "Bill Gates",
            description: "This is a description of a book.",
            image: "http://www.zackward.net/test.jpg"
        };

        describe('When not authenticated', function () {

            before(function () {
                return makeRequest('post', '/api/books', false, newBook).then(res => this.res = res);
            });

            it('Should return a status 403', function () {
                expect(this.res).to.have.status(403);
            });

            it('Should return a JSON object', function () {
                expect(this.res).to.be.json;
            });
        });

        describe('When authenticated', function () {

            before(function () {
                // Use the agent, which is authenticated to the zack2 account
                return resetDatabase()
                    .then(() => {
                        return makeAuthenticatedRequest('post', '/api/books', true, newBook).then(res => this.res = res);
                    });
            });

            it('Should return a status 200', function () {
                expect(this.res).to.have.status(200);
            });

            it('Should return a JSON object', function () {
                expect(this.res).to.be.json;
            });

            it('Should have a body field', function () {
                expect(this.res.body).to.exist;
            });

            it('Should have a body.data field', function () {
                expect(this.res.body.data).to.exist;
            });

            it('Should have a body.data.id field', function () {
                expect(this.res.body.data.id).to.exist;
            });

            it('Should have a numeric value in the body.data.id field', function () {
                expect(this.res.body.data.id).to.be.a('number');
                // We'll save this ID, so that we can use it later to edit the book
                createdBookID = Number(this.res.body.data.id);
            });

            it('Should have a body.data.available field', function () {
                expect(this.res.body.data.available).to.exist;
            });

            it('Should have a value of true in body.data.available field', function () {
                expect(this.res.body.data.available).to.be.true;
            });

            it("Should actually insert a new record into the database", function () {

                let queryInclusions = [
                    {
                        model: db.User,
                        where: {username: fixtures.users.fakeuser1.username}
                    },
                    {
                        model: db.Book,
                        where: {
                            title: newBook.title,
                            subtitle: newBook.subtitle,
                            authors: newBook.authors,
                            description: newBook.description,
                            image: newBook.image
                        }
                    }
                ];

                return db.BookCopy.findAll({include: queryInclusions}).then(result => {
                    fixtures.newBook = result[0];
                    expect(result).not.to.be.null;
                    expect(result).to.be.lengthOf(1);
                });
            });
        });
    });

    describe("Update a book", function () {

        before(function () {
            return resetDatabase();
        });

        describe("As an unauthenticated user", function () {

            before(function () {
                return makeRequest('patch', '/api/books/' + fixtures.bookcopies.copy1.id, false, {available: false}).then(res => this.res = res);
            });

            it("Should return a status 401", function () {
                expect(this.res).to.have.status(401);
            });
        });

        describe("As an authenticated user attempting to update a book that I do not own", function () {
            
            before(function () {
                return makeAuthenticatedRequest('patch', '/api/books/' + fixtures.bookcopies.copy3.id, true, {available: false}).then(res => this.res = res);
            });

            it("Should return a status 401 response", function () {
                expect(this.res).to.have.status(401);
            });
        });

        describe("As an authenticated user attempting to update a book that I own", function () {

            before(function () {
                return makeAuthenticatedRequest('patch', '/api/books/' + fixtures.bookcopies.copy1.id, true, {available: false}).then(res => this.res = res);
            });

            it("Should respond with a status 200", function () {
                expect(this.res).to.have.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a body.available field", function () {
                expect(this.res.body.available).to.exist;
            });

            it("Should have the body.available field set to false", function () {
                expect(this.res.body.available).to.be.false;
            });
        });
    });

    describe("Retrieve a list of books", function () {

        before(function () {
            return resetDatabase();
        });

        describe("As an unauthenticated user", function () {

            before(function () {
                return makeRequest('get', '/api/books', false, false).then(res => this.res = res);
            });

            it("Should return a status 200", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should return an array", function () {
                expect(Array.isArray(this.res.body)).to.be.true;
            });

            let numberOfBooks = Object.keys(newFixtures.bookcopies).length;

            it("Should have " + numberOfBooks + " books in the array", function () {
                expect(this.res.body).to.be.lengthOf(numberOfBooks);
            });
        });

        describe("When the owner=fakeuser1 query parameter is passed", function () {

            before(function () {
                return makeRequest('get', '/api/books?owner=fakeuser1', true, false).then(res => this.res = res);
            });

            it("Should return a status 200 response", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should return an array", function () {
                expect(Array.isArray(this.res.body)).to.be.true;
            });

            it("Should have 2 books in the array", function () {
                expect(this.res.body).to.be.lengthOf(2);
            });

            it("Should not return books owned by anybody other than fakeuser1", function () {
                let incorrectEntries = this.res.body.filter(book => book.owner != "fakeuser1");
                expect(incorrectEntries).to.have.lengthOf(0);
            });
        });

        describe("When the includeRequests=true query paramater is passed", function () {

            before(function () {
                return makeAuthenticatedRequest('get', '/api/books?includeRequests=true', true, false).then(res => this.res = res);
            });

            it("Should return a 200 status", function () {
                expect(this.res).to.be.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should return an array of books", function () {
                expect(Array.isArray(this.res.body)).to.be.true;
            });

            it("Should include a requests element, that is either an array or a number, in every array item.", function () {
                this.res.body.forEach(book => {
                    if (book.owner == "fakeuser1") {
                        expect(Array.isArray(book.requests)).to.be.true;
                    } else {
                        expect(book.requests).to.be.a('number');
                    }

                });
            });
        });

        describe("When the user has already requested a book in the list", function () {

            before(function () {
                return makeAuthenticatedRequest('get', '/api/books', true, false).then(res => this.res = res);
            });

            it("Should have a requestedByCurrentUser field with a value of true", function () {
                // fixtures.copy1 is the book that we set a request up for
                let target = this.res.body.filter(book => book.id == fixtures.bookcopies.copy3.id)[0];
                expect(target.requestedByCurrentUser).to.exist;
                expect(target.requestedByCurrentUser).to.equal(true);
            });
        });
    });    

    describe("Make a new trade request", function () {

        before(function () {
            return resetDatabase();
        });

        describe('As an unauthenticated user', function () {

            before(function () {
                return makeRequest('post', '/api/books/1/requests', false, false).then(res => this.res = res);
            });

            it("Shuld return a 401 status", function () {
                expect(this.res).to.have.a.status(401);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

        });

        describe("As an authenticated user, when making a trade request without offering books in exchange", function () {

            before(function () {
                return makeAuthenticatedRequest('post', '/api/books/' + fixtures.bookcopies.copy4.id + '/requests', true, false).then(res => this.res = res);
            });

            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message property", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "Field 'booksOffered' must be an array of integers";

            it("Should respond with the message: " + errorMessage, function () {
                expect(this.res.body.message).to.equal(errorMessage);
            });

        });

        describe("As an authenticated user, when making a trade request, offering a book that you do not own", function () {

            before(function () {
                return makeRequest('post', '/api/books/' + fixtures.bookcopies.copy4.id + '/requests', true, {booksOffered: [99]}).then(res => this.res = res);
            });

            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message property", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "You must offer at least 1 book in exchange if you would like to make a trade request.";

            it("Should respond with the message: " + errorMessage, function () {
                expect(this.res.body.message).to.equal(errorMessage);
            });

        });

        describe("As an authenticated user, when requesting a book that the user owns", function () {

            before(function () {
                let payload = {
                    booksOffered: [ fixtures.bookcopies.copy2.id ]
                };
                return makeAuthenticatedRequest('post', '/api/books/' + fixtures.bookcopies.copy1.id + '/requests', true, payload).then(res => this.res = res);
            });

            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message property", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "You cannot trade with yourself. This is a book that you already own."

            it("Should respond with the message: " + errorMessage, function () {
                expect(this.res.body.message).to.equal(errorMessage);
            });

        });

        describe("As an authenticated user, when requesting a book that another user owns", function () {

            before(function () {
                let payload = {
                    booksOffered: [ fixtures.bookcopies.copy2.id ]
                };
                return makeAuthenticatedRequest('post', '/api/books/' + fixtures.bookcopies.copy4.id + '/requests', true, payload).then(res => this.res = res);
            });

            it("Should return a 200 status response", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a field called status", function () {
                expect(this.res.body.status).to.exist;
            });

            it("Should have the string \"pending\" in the status field", function () {
                expect(this.res.body.status).to.equal("pending");
            });
        });
    });

    describe("Get a list of trade requests for a given book", function () {

        before(function () {
            return resetDatabase();
        });

        describe("As an unauthenticated user", function () {

            before(function () {
                return makeRequest('get', '/api/books/' + fixtures.bookcopies.copy3.id + '/requests', false, false).then(res => this.res = res);
            });

            it("Should return a 200 response code", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a requests field", function () {
                expect(this.res.body.requests).to.exist;
            });

            it("Should return a number in the requests field", function () {
                expect(Number(this.res.body.requests)).to.be.a('number');
            });

            it("Should return the number 2", function () {
                expect(Number(this.res.body.requests)).to.equal(2);
            });

        });

        describe("As an authenticated user that doesn't own the book", function () {

            before(function () {
                return makeAuthenticatedRequest('get', '/api/books/' + fixtures.bookcopies.copy3.id + '/requests', true, false).then(res => this.res = res);
            });

            it("Should return a 200 response code", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a requests field", function () {
                expect(this.res.body.requests).to.exist;
            });

            it("Should return a number in the requests field", function () {
                expect(Number(this.res.body.requests)).to.be.a('number');
            });

            it("Should return the number 2", function () {
                expect(Number(this.res.body.requests)).to.equal(2);
            });

        });

        describe("As an authenticated user that owns the book", function () {

            before(function () {
                return makeAuthenticatedRequest('get', '/api/books/' + fixtures.bookcopies.copy1.id + '/requests', true, false).then(res => this.res = res);
            });
            
            it("Should return a 200 status response", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should return an array", function () {
                expect(Array.isArray(this.res.body.requests)).to.be.true;
            });

            it("Should have an id field that is a number", function () {
                expect(this.res.body.requests[0].id).to.exist;
                expect(Number(this.res.body.requests[0].id)).to.be.a('number');
            });

            it("Should have a status field", function () {
                expect(this.res.body.requests[0].status).to.exist;
            });
        });
    });

    describe.only("Approve a trade request", function () {

        before(function () {
            return resetDatabase();
        });

        describe("That does not exist", function () {

            before(function () {
                let url = '/api/books/' + fixtures.bookcopies.copy1.id + '/requests/999';
                return makeRequest('post', url, true, {action: "approve"}).then(res => this.res = res);
            });

            it("Should return a status 404 response", function () {
                expect(this.res).to.have.a.status(404);
            });
        });

        describe("Without choosing a book to exchange", function () {

            before(function () {
                let url = '/api/books/' + fixtures.bookcopies.copy2.id + '/requests/' + fixtures.requests.request2.id;
                return makeAuthenticatedRequest('post', url, true, false).then(res => this.res = res);
            });

            it("Should return a status 400 response", function () {
                expect(this.res).to.have.a.status(400);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "The exchangedBook field must contain an integer."

            it("Should have the value \"" + errorMessage + "\" in the message field", function () {
                expect(String(this.res.body.message)).to.equal(errorMessage);
            });

        });

        describe("As an unauthenticated user", function () {

            let payload = {
                exchangedBook: 5
            };

            before(function () {
                let url = '/api/books/' + fixtures.bookcopies.copy2.id + '/requests/' + fixtures.requests.request2.id;
                return makeRequest('post', url, false, payload).then(res => this.res = res);
            });
            
            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a error field", function () {
                expect(this.res.body.error).to.exist;
            });

            let errorMessage = "You must be logged in to approve a trade request.";

            it("Should have the value \"" + errorMessage + "\" in the error field", function () {
                expect(this.res.body.error).to.equal(errorMessage);
            });

        });

        describe("As an authenticated user who isn't the owner of the book that has been requested", function () {

            before(function () {
                let url = '/api/books/' + fixtures.bookcopies.copy3.id + '/requests/' + fixtures.requests.request3.id;
                let payload = {
                    exchangedBook: fixtures.bookcopies.copy1.id
                };
                return makeAuthenticatedRequest('post', url, true, payload).then(res => this.res = res);
            });
            
            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "You do not have permission to approve that trade request."

            it("Should have the value \"" + errorMessage + "\" in the error field", function () {
                expect(this.res.body.message).to.equal(errorMessage);
            });
        });

        describe("As an authenticated user, who owns the book, but with an invalid exchangedBook", function () {

             before(function () {
                let url = '/api/books/' + fixtures.bookcopies.copy2.id + '/requests/' + fixtures.requests.request2.id;
                return makeAuthenticatedRequest('post', url, true, {exchangedBook: 99}).then(res => this.res = res);
            });

            it("Should return a 400 status", function () {
                expect(this.res).to.have.a.status(400);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "You cannot exchange a book that doesn't exist.";

            it("Should have a value of \"" + errorMessage + "\" in the message field", function () {
                expect(this.res.body.message).to.equal(errorMessage);
            });

        });

        describe("As an authenticated user, who owns the book, when attempting to exchange a book that wasn't offered", function () {
            
            before(function () {
                let url = '/api/books/' + fixtures.bookcopies.copy2.id + '/requests/' + fixtures.requests.request2.id;
                return makeAuthenticatedRequest('post', url, true, {exchangedBook: fixtures.bookcopies.copy5.id}).then(res => this.res = res);
            });

            it("Should return a 400 status", function () {
                expect(this.res).to.have.a.status(400);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            let errorMessage = "The exchanged book must be one of the books that was offered.";

            it("Should have a value of \"" + errorMessage + "\" in the message field", function () {
                expect(this.res.body.message).to.equal(errorMessage);
            });

        });

        describe("As an authenticated user, who owns the book", function () {
        

            before(function () {
                let payload = {
                    exchangedBook: fixtures.copy1.id,
                    shippingInstructions: "Ship me the book plz!"
                };
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest1.id;
                return makeRequest('post', url, true, payload).then(res => this.res = res);
            });

            it("Should return a 200 status", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            let successMessage = "Request approved";

            it("Should have a value of \"" + successMessage + "\" in the message field", function () {
                expect(this.res.body.message).to.equal(successMessage);
            });

        });

    });

    describe("Decline a trade request", function () {

        describe("That does not exist", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/999';
                return makeRequest('delete', url, true, false).then(res => this.res = res);
            });

            it("Should return a status 404 response", function () {
                expect(this.res).to.have.a.status(404);
            });
        });

        describe("As an unauthenticated user", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest2.id;
                return makeRequest('delete', url, false, false).then(res => this.res = res);
            });
            
            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a error field", function () {
                expect(this.res.body.error).to.exist;
            });

            it("Should have the value \"You must be logged in to modify a trade request\" in the error field", function () {
                expect(this.res.body.error).to.equal('You must be logged in to modify a trade request');
            });

        });

        describe("As an authenticated user who isn't the owner of the book", function () {

            before(function () {
                let url = '/api/books/' + fixtures.copy3.id + '/requests/' + fixtures.request4.id;
                return makeRequest('delete', url, true, false).then(res => this.res = res);
            });
            
            it("Should return a 403 status response", function () {
                expect(this.res).to.have.a.status(403);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a error field", function () {
                expect(this.res.body.error).to.exist;
            });

            it("Should have the value \"You do not have permission to modify that trade request\" in the error field", function () {
                expect(this.res.body.error).to.equal('You do not have permission to modify that trade request');
            });
        });

        describe("As an authenticated user, who owns the book", function () {
            
            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest2.id;
                return makeRequest('delete', url, true, false).then(res => this.res = res);
            });

            it("Should return a 200 status", function () {
                expect(this.res).to.have.a.status(200);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            it("Should have a value of \"Request declined\" in the message field", function () {
                expect(this.res.body.message).to.equal("Request declined");
            });

        });

    });

    describe("Get a list of requests for a given user", function () {

        describe("As an unauthenticated user", function () {

            it("Should return an error");

        });

        describe("As an authenticated user, but not the user requested", function () {

            it("Should return an error");

        });

        describe("As an authenticated user, the user that was requested", function () {

            it("Should return the list of requests");

        });
    });

    describe("Delete/cancel a book request", function () {

        describe("As an unauthenticated user", function () {

            it("Should return an error");

        });

        describe("As an authenticated user that doesn't own the request", function () {

            it("Should return an error");

        });

        describe("As an authenticated user that owns the request", function () {

            it("Should delete/cancel the request");

        });
    });

    describe("Delete a book", function () {

        describe("As an unauthenticated user", function () {

            before(function () {
                return makeRequest('delete', '/api/books/' + createdBookID, false, false).then(res => this.res = res);
            });

            it("Should return a status 401 response", function () {
                expect(this.res).to.have.status(401);
            });
        });

        describe("As an authenticated user who doesn't own the book", function () {

            before(function () {
                return makeRequest('delete', '/api/books/1', true, false).then(res => this.res = res);
            });
            
            it("Should return a status 401 response", function () {
                expect(this.res).to.have.a.status(401);
            });
        });

        describe("As an authenticated user who owns the book", function () {

            before(function () {
                return makeRequest('delete', '/api/books/' + createdBookID, true).then(res => this.res = res);
            });

            it("Should return a 200 status response", function () {
                expect(this.res).to.have.status(200);
            });

            it("Should actually remove the book from the database", function () {
                db.BookCopy.findOne({ where: {id: createdBookID} })
                .then(book => {
                    expect(book).to.be.null;
                });
            });
        });
    });

    describe("Retrieve user records", function () {

        before(function () {
            return resetDatabase();
        });

        it("Should return user records");
    });
});