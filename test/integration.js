var cookie = require('cookie');
var signature = require('cookie-signature');
var mocha = require('mocha');
var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('../build/book-club-server');
var config = require('../build/config').default;

chai.use(chaiHttp);

let expect = chai.expect;
let server = app.server;
let db = app.models;
let session = app.session;

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


describe("API Integration Tests", function () {

    let createdBookID; // We'll store the ID when we create a book, that way we can edit it later
    let fixtures;

    function makeBook(user, book) {
        let newBook = db.BookCopy.build({available: true});
        newBook.setBook(book, {save: false});
        newBook.setUser(user, {save: false});
        return newBook;
    };

    function buildRequest(status, bookCopy, user) {
        let newRequest = db.LoanRequest.build({ status: status });
        newRequest.setUser(user, { save: false });
        newRequest.setBookCopy(bookCopy, { save: false });
        return newRequest;
    };

    function buildDatabase() {
        return new Promise(function (resolve, reject) {
            let user1p = db.User.create({username: "fakeuser1", password: "$2a$10$d/2xu830XZvcdWguJpIsXuu4xhrpBv7wU9JiTH1n3Ny00D/QAyiIq"});
            let user2p = db.User.create({username: "fakeuser2", password: "$2a$10$d/2xu830XZvcdWguJpIsXuu4xhrpBv7wU9JiTH1n3Ny00D/QAyiIq"});
            let user3p = db.User.create({username: "fakeuser3", password: "$2a$10$d/2xu830XZvcdWguJpIsXuu4xhrpBv7wU9JiTH1n3Ny00D/QAyiIq"});
            let book1p = db.Book.create({title: "Fake Book One"});
            let book2p = db.Book.create({title: "Fake Book Two"});
            let book3p = db.Book.create({title: "Fake Book Three"});
            Promise.all([user1p, user2p, user3p, book1p, book2p, book3p])
            .then(([user1, user2, user3, book1, book2, book3]) => {
                fixtures = {user1, user2, user3, book1, book2, book3}
                fixtures.copy1 = makeBook(fixtures.user1, fixtures.book1);
                fixtures.copy2 = makeBook(fixtures.user1, fixtures.book2);
                fixtures.copy3 = makeBook(fixtures.user2, fixtures.book3);
                return Promise.all([fixtures.copy1.save(), fixtures.copy2.save(), fixtures.copy3.save()]);
            })
            .then(([copy1, copy2, copy3]) => {
                fixtures.request1 = buildRequest('requested', fixtures.copy1, fixtures.user2);
                fixtures.request2 = buildRequest('requested', fixtures.copy2, fixtures.user2);
                fixtures.request3 = buildRequest('requested', fixtures.copy3, fixtures.user1);
                fixtures.request4 = buildRequest('requested', fixtures.copy3, fixtures.user3);
                return Promise.all([fixtures.request1.save(), fixtures.request2.save(), fixtures.request3.save(), fixtures.request4.save()]);
            })
            .then(([r1, r2, r3, r4]) => {
                console.log("Database set up");
                resolve();
            })
            .catch(error => reject(error));
        });
    }
    
    before(function (done) {
        // Empty the database
        db.sequelize.sync({force: true})
        .then(() => {
            console.log("Cleared database!");
            return buildDatabase();
        })
        .then(() => done())
        .catch(error => done(error));
    });

    describe("Create a new user", function () {

        let userData = {
            username: 'zack2',
            password: 'zack2'
        };

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
                    fixtures.newUser = user;
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

        describe("When given an invalid username and/or password", function () {

            let payload = {username: "zack2", password: "incorrect"};

            before(function () {
                return makeRequest('post', '/api/users/login', false, payload).then(res => this.res = res);
            });

            it("Should return a status 400", function () {
                expect(this.res).to.have.a.status(400);
            });
        });

        describe("When provided with a valid username and password", function () {

            let payload = {username: "zack2", password: "zack2"};

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

        let updateData = { first_name: "Zachary", last_name: "Ward", password: "zack3", city: "Monte Vista", state: "Colorado" };

        describe("When authenticated, and attemtping to update your own account", function () {

            before(function () {
                return makeRequest('patch', '/api/users/zack2', true, updateData).then(res => this.res = res);
            });

            it("Should return a status 200", function () {
                expect(this.res).to.have.a.status(200);
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

            it("Should actually change the user's information in the database", function () {
                return fixtures.newUser.reload().then(() => {
                    expect(fixtures.newUser.firstName).to.equal(updateData.first_name);
                    expect(fixtures.newUser.lastName).to.equal(updateData.last_name);
                    expect(fixtures.newUser.city).to.equal(updateData.city);
                    expect(fixtures.newUser.state).to.equal(updateData.state);
                });
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
                return makeRequest('post', '/api/books', true, newBook).then(res => this.res = res);
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
                        where: {username: fixtures.newUser.username}
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

        describe("As an unauthenticated user", function () {

            before(function () {
                return makeRequest('patch', '/api/books/' + createdBookID, false, {available: false}).then(res => this.res = res);
            });

            it("Should return a status 401", function () {
                expect(this.res).to.have.status(401);
            });
        });

        describe("As an authenticated user attempting to update a book that I do not own", function () {
            
            before(function () {
                return makeRequest('patch', '/api/books/1', true, {available: false}).then(res => this.res = res);
            });

            it("Should return a status 401 response", function () {
                expect(this.res).to.have.status(401);
            });
        });

        describe("As an authenticated user attempting to update a book that I own", function () {

            before(function () {
                return makeRequest('patch', '/api/books/' + createdBookID, true, {available: false}).then(res => this.res = res);
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
            let newLoanRequest = db.LoanRequest.build({status: "requested"});
            newLoanRequest.setBookCopy(fixtures.copy1, {save: false});
            newLoanRequest.setUser(fixtures.newUser, {save: false});
            return newLoanRequest.save()
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

            it("Should have 4 books in the array", function () {
                expect(this.res.body).to.be.lengthOf(4);
            });
        });

        describe("When the owner=zack2 query parameter is passed", function () {

            before(function () {
                return makeRequest('get', '/api/books?owner=zack2', true, false).then(res => this.res = res);
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

            it("Should have 1 book in the array", function () {
                expect(this.res.body).to.be.lengthOf(1);
            });

            it("Should not return books owned by anybody other than zack2", function () {
                let incorrectEntries = this.res.body.filter(book => book.owner != "zack2");
                expect(incorrectEntries).to.have.lengthOf(0);
            });
        });

        describe("When the includeRequests=true query paramater is passed", function () {

            before(function () {
                return makeRequest('get', '/api/books?includeRequests=true', true, false).then(res => this.res = res);
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
                    if (book.owner == "zack2") {
                        expect(Array.isArray(book.requests)).to.be.true;
                    } else {
                        expect(book.requests).to.be.a('number');
                    }

                });
            });
        });

        describe("When the user has already requested a book in the list", function () {

            before(function () {
                return makeRequest('get', '/api/books', true, false).then(res => this.res = res);
            });

            it("Should have a requestedByCurrentUser field with a value of true", function () {
                // fixtures.copy1 is the book that we set a request up for
                let target = this.res.body.filter(book => book.id == fixtures.copy1.id)[0];
                expect(target.requestedByCurrentUser).to.exist;
                expect(target.requestedByCurrentUser).to.equal(true);
            });
        });
    });    

    describe("Make a new loan request", function () {

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

        describe("As an authenticated user, when requesting a book that the user owns", function () {

            before(function () {
                return makeRequest('post', '/api/books/' + createdBookID + '/requests', true, false).then(res => this.res = res);
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

            it("Should respond with the message: You own this book, and so cannot request to borrow it.", function () {
                expect(this.res.body.message).to.equal('You own this book, and so cannot request to borrow it.');
            });

        });

        describe("As an authenticated user, when requesting a book that another user owns", function () {

            before(function () {
                return makeRequest('post', '/api/books/1/requests', true, false).then(res => this.res = res);
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

            it("Should have the string \"requested\" in the status field", function () {
                expect(this.res.body.status).to.equal("requested");
            });
        });
    });

    describe("Get a list of loan requests for a given book", function () {

        describe("As an unauthenticated user", function () {

            // use fixtures.copy3
            before(function () {
                return makeRequest('get', '/api/books/' + fixtures.copy3.id + '/requests', false, false).then(res => this.res = res);
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

            // use fixtures.copy3, use the authenticated agent
            before(function () {
                return makeRequest('get', '/api/books/' + fixtures.copy3.id + '/requests', true, false).then(res => this.res = res);
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
                // Insert a couple of requests into the database
                fixtures.newRequest1 = db.LoanRequest.build({status: "requested"});
                fixtures.newRequest1.setUser(fixtures.user1, {save: false});
                fixtures.newRequest1.setBookCopy(fixtures.newBook, {save: false});
                fixtures.newRequest2 = db.LoanRequest.build({status: "requested"});
                fixtures.newRequest2.setUser(fixtures.user2, {save: false});
                fixtures.newRequest2.setBookCopy(fixtures.newBook, {save: false});
                return Promise.all([fixtures.newRequest1.save(), fixtures.newRequest2.save()])
                .then(([r1, r2]) => {
                    return makeRequest('get', '/api/books/' + fixtures.newBook.id + '/requests', true, false).then(res => this.res = res);
                });
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

    describe("Approve a loan request", function () {

        describe("That does not exist", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/999';
                return makeRequest('patch', url, true, {action: "approve"}).then(res => this.res = res);
            });

            it("Should return a status 404 response", function () {
                expect(this.res).to.have.a.status(404);
            });
        });

        describe("With an invalid action", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest2.id;
                return makeRequest('patch', url, true, {action: "invalid"}).then(res => this.res = res);
            });

            it("Should return a status 401 response", function () {
                expect(this.res).to.have.a.status(401);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            it("Should have the value \"Invalid action\" in the message field", function () {
                expect(String(this.res.body.message)).to.equal("Invalid action");
            });

        });

        describe("As an unauthenticated user", function () {

            let payload = {
                action: "approve"
            };

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest1.id;
                return makeRequest('patch', url, false, payload).then(res => this.res = res);
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

            it("Should have the value \"You must be logged in to modify a loan request\" in the error field", function () {
                expect(this.res.body.error).to.equal('You must be logged in to modify a loan request');
            });

        });

        describe("As an authenticated user who isn't the owner of the book", function () {

            let payload = {
                action: "approve"
            };

            before(function () {
                let url = '/api/books/' + fixtures.copy3.id + '/requests/' + fixtures.request4.id;
                return makeRequest('patch', url, true, payload).then(res => this.res = res);
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

            it("Should have the value \"You do not have permission to modify that loan request\" in the error field", function () {
                expect(this.res.body.error).to.equal('You do not have permission to modify that loan request');
            });
        });

        describe("As an authenticated user, who owns the book", function () {
            
            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest1.id;
                return makeRequest('patch', url, true, {action: "approve"}).then(res => this.res = res);
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

            it("Should have a value of \"Request approved\" in the message field", function () {
                expect(this.res.body.message).to.equal("Request approved");
            });

        });

    });

    describe("Decline a loan request", function () {

        let payload = {action: "decline"};

        describe("That does not exist", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/999';
                return makeRequest('patch', url, true, payload).then(res => this.res = res);
            });

            it("Should return a status 404 response", function () {
                expect(this.res).to.have.a.status(404);
            });
        });

        describe("With an invalid action", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest2.id;
                return makeRequest('patch', url, true, {action: "invalid"}).then(res => this.res = res);
            });

            it("Should return a status 401 response", function () {
                expect(this.res).to.have.a.status(401);
            });

            it("Should return a JSON object", function () {
                expect(this.res).to.be.json;
            });

            it("Should have a message field", function () {
                expect(this.res.body.message).to.exist;
            });

            it("Should have the value \"Invalid action\" in the message field", function () {
                expect(String(this.res.body.message)).to.equal("Invalid action");
            });

        });

        describe("As an unauthenticated user", function () {

            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest2.id;
                return makeRequest('patch', url, false, payload).then(res => this.res = res);
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

            it("Should have the value \"You must be logged in to modify a loan request\" in the error field", function () {
                expect(this.res.body.error).to.equal('You must be logged in to modify a loan request');
            });

        });

        describe("As an authenticated user who isn't the owner of the book", function () {

            before(function () {
                let url = '/api/books/' + fixtures.copy3.id + '/requests/' + fixtures.request4.id;
                return makeRequest('patch', url, true, payload).then(res => this.res = res);
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

            it("Should have the value \"You do not have permission to modify that loan request\" in the error field", function () {
                expect(this.res.body.error).to.equal('You do not have permission to modify that loan request');
            });
        });

        describe("As an authenticated user, who owns the book", function () {
            
            before(function () {
                let url = '/api/books/' + fixtures.newBook.id + '/requests/' + fixtures.newRequest2.id;
                return makeRequest('patch', url, true, payload).then(res => this.res = res);
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

    describe("Mark a borrowed book as returned", function () {

        describe("As an unauthenticated user, or as an authenticated user who is not the borrower", function () {

            it("Should return an error");

        });

        describe("As an authenticated user, who is the borrower", function () {

            it("Should succeed!");

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
});