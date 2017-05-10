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

    function buildDatabase() {
        return new Promise(function (resolve, reject) {
            let user1p = db.User.create({username: "fakeuser1", password: "$2a$10$d/2xu830XZvcdWguJpIsXuu4xhrpBv7wU9JiTH1n3Ny00D/QAyiIq"});
            let user2p = db.User.create({username: "fakeuser2", password: "$2a$10$d/2xu830XZvcdWguJpIsXuu4xhrpBv7wU9JiTH1n3Ny00D/QAyiIq"});
            let book1p = db.Book.create({title: "Book One"});
            let book2p = db.Book.create({title: "Book Two"});
            let book3p = db.Book.create({title: "Book Three"});
            Promise.all([user1p, user2p, book1p, book2p, book3p])
            .then(([user1, user2, book1, book2, book3]) => {
                let copy1 = db.BookCopy.build({available: true});
                copy1.setBook(book1, {save: false});
                copy1.setUser(user2, {save: false});
                let copy2 = db.BookCopy.build({available: true});
                copy2.setBook(book2, {save: false});
                copy2.setUser(user1, {save: false});
                let copy3 = db.BookCopy.build({available: true});
                copy3.setBook(book3, {save: false});
                copy3.setUser(user2, {save: false});
                let copy4 = db.BookCopy.build({available: true});
                copy4.setBook(book1, {save: false});
                copy4.setUser(user1, {save: false});
                let copy5 = db.BookCopy.build({available: true});
                copy5.setBook(book2, {save: false});
                copy5.setUser(user2, {save: false});
                let copy6 = db.BookCopy.build({available: true});
                copy6.setBook(book3, {save: false});
                copy6.setUser(user1, {save: false});
                return Promise.all([copy1.save(), copy2.save(), copy3.save(), copy4.save(), copy5.save(), copy6.save()]);
            })
            .then(([copy1, copy2, copy3, copy4, copy5, copy6]) => {
                console.log("Inserted a bunch of stuff into the database!");
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

            it("Should return a status 200", function (done) {
                expect(this.res).to.have.status(200);
                done();
            });
            
            it("Should return a JSON object", function (done) {
                expect(this.res).to.be.json;
                done();
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

        before(function makeRequest(done) {
            agent.get('/api/users/logout')
            .then(res => {
                this.res = res;
                done();
            })
            .catch(err => done(err));
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

            before(function makeRequest(done) {
                chai.request(server).post('/api/users/login').send(payload)
                .then(res => {
                    this.res = res;
                    done();
                })
                .catch(({ response }) => {
                    this.res = response;
                    done();
                });
            });

            it("Should return a status 400", function () {
                expect(this.res).to.have.a.status(400);
            });
        });

        describe("When provided with a valid username and password", function () {

            let payload = {username: "zack2", password: "zack2"};

            before(function makeRequest(done) {
                // Use the chai-http agent, so that cookies will be preserved for future requests
                agent.post('/api/users/login').send(payload)
                .then(res => {
                    this.res = res;
                    done();
                })
                .catch(({ response }) => {
                    this.res = response;
                    done();
                });
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

        it("Should return a list of all books", function (done) {
            agent.get('/api/books')
            .then(res => {
                expect(res).to.be.status(200);
                expect(res).to.be.json;
                expect(Array.isArray(res.body)).to.be.true;
                expect(res.body).to.be.lengthOf(7);
                done();
            })
            .catch(err => done(err));
        });

        it("Should optionally return a list of books owned by a given user", function (done) {
            agent.get('/api/books?owner=zack2')
            .then(res => {
                expect(res).to.be.status(200);
                expect(res).to.be.json;
                expect(Array.isArray(res.body)).to.be.true;
                expect(res.body).to.be.lengthOf(1);
                let incorrectEntries = res.body.filter(book => book.owner != "zack2");
                expect(incorrectEntries).to.have.lengthOf(0);
                done();
            })
            .catch(err => done(err));
        });

        it("Should optionally include loan request data. Logged in users get details, others get request count.", function (done) {
            agent.get('/api/books?includeRequests=true')
            .then(res => {
                expect(res).to.be.status(200);
                expect(res).to.be.json;
                expect(Array.isArray(res.body)).to.be.true;
                res.body.map(book => {
                    // I know that the chai http agent has a cookie for logged in user zack2. 
                    // If the book is owned by zack2, the requests field should be an array. If not, it should be a number
                    if (book.owner == "zack2") {
                        expect(Array.isArray(book.requests)).to.be.true;
                    } else {
                        expect(book.requests).to.be.a("number");
                    }
                });
                done();
            })
            .catch(err => done(err));
        });
    });    

    describe("Make a new loan request", function () {

        it("Should return a 401 unauthorized status for an unauthenticated user");

        it("Should return an error when an authenticated user tries to request a book that they own");
        
        it("Should create a new Loan Request for an authenticated user");


    });

    describe("Get a list of loan requests for a given book", function () {

        it("Should return a list of book requests");

    });

    describe("Update a loan request", function () {

        it("Should update a loan request");

    });

    describe("Delete/cancel a book request", function () {

        it("Should delete a loan request");

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

            it("Should return a status 401 response");
        });

        describe("As an authenticated user who owns the book", function () {

            before(function () {
                return makeRequest('delete', '/api/books/' + createdBookID, true).then(res => this.res = res);
            });

            it("Should return a 200 status response", function () {
                expect(this.res).to.have.status(200);
            });

            it("Should actually remove the book from the database");
        });
    });
});