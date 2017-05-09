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

        it("Should create a user if given valid input", function (done) {
            agent.post('/api/users').send(userData)
            .then(res => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                done();
            })
            .catch(error => done(new Error(error)));
        });

        it("Shouldn't allow duplicate usernames", function (done) {
            chai.request(server).post('/api/users').send(userData)
            .then(res => done(new Error("We should have received an error!")))
            .catch(({ response }) => {
                expect(response).to.have.status(403);
                expect(response).to.be.json;
                done();
            });
        });
    });

    describe("Logout", function () {
        it("Should log the current user off", function (done) {
            agent.get('/api/users/logout')
            .then(res => {
                expect(res).to.be.status(200);
                expect(res).to.be.json;
                expect(res.header['set-cookie']).to.equal(undefined);
                done();
            })
            .catch(error => done(error));
        });
    });

    describe("Login", function () {

        it("Should return an error when given an invalid username and/or password", function (done) {
            let payload = {username: "zack2", password: "incorrect"};
            chai.request(server).post('/api/users/login').send(payload)
            .then(res => {
                done(new Error("Login with incorrect username/password returned positive response"));
            })
            .catch(({ response }) => {                    
                expect(response).to.be.status(400);
                done();
            });
        });

        it("Should log us in when provided with a valid username and password", function (done) {
            let payload = {username: "zack2", password: "zack2"};
            agent.post('/api/users/login').send(payload)
            .then(res => {
                expect(res).to.be.status(200);
                expect(res).to.have.a.cookie('connect.sid');

                // Check the session on the server and make sure that the username is correct
                let cookies = cookie.parse(String(res.header['set-cookie']));
                let sid = cookies['connect.sid'].slice(2);
                let unsignedSid = signature.unsign(sid, config.cookieSecret);
                expect(unsignedSid).not.to.be.false;

                session.get(unsignedSid, function (error, ses) {
                    if (error) return done(error);
                    if (ses == null) return done(new Error("No session found"));
                    expect(ses.user).to.equal(payload.username);
                    done();
                });
            })
            .catch(error => done(error));
        });
    });

    describe("Update a user's profile and password ", function () {

        let updateData = {
            first_name: "Zachary",
            last_name: "Ward",
            password: "zack3",
            city: "Monte Vista",
            state: "Colorado"
        };

        it("Should update a user", function (done) {
            // Make the request using the agent that we logged in with earlier, in order to authenticate this request
            agent.patch('/api/users/zack2').send(updateData)
            .then(res => {
                expect(res).to.have.status(200);
                done();
            })
            .catch(error => done(error));
        });

        it("Should reject attempts to update any user that isn't logged in", function (done) {
            agent.patch('/api/users/zack').send(updateData)
            .then(res => done(new Error("Attempting to update a user that isn't logged in returned a status 200")))
            .catch(({ response }) => {
                expect(response).to.be.status(403);
                expect(response).to.be.json;
                done();
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

        it("Should create a book", function (done) {
            agent.post('/api/books').send(newBook)
            .then(res => {
                expect(res).to.have.a.status(200);
                expect(res).to.be.json;
                expect(res.body.data.available).to.be.true;
                createdBookID = Number(res.body.data.id);
                done();
            })
            .catch(error => done(error));
        });
    });

    describe("Update a book", function () {

        it("Should update a book for authenticated users", function (done) {
            // Use the agent that has authenticated for this request
            agent.patch('/api/books/' + createdBookID).send({available: false})
            .then(res => {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.available).to.be.false;
                done()
            })
            .catch(err => done(err));
        });

        it("Should return an error for unathenticated users", function (done) {
            chai.request(server).patch('/api/books/' + createdBookID).send({available: true})
            .then(res => done(new Error("We should not have received a positive response when attempting to edit a book while unauthenticated")))
            .catch(({ response }) => {
                expect(response).to.have.status(401);
                done();
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

        it("Should create a new Loan Request");

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

        it("Should return an error for an unauthenticated delete request", function (done) {
            chai.request(server).delete('/api/books/' + createdBookID).type('json')
            .then(res => done(new Error("We should receieve an error when trying to delete a book if we aren't authenticated, or if we don't own the book!")))
            .catch(({ response }) => {
                expect(response).has.a.status(401);
                done();
            });
        });

        it("Should delete a book", function (done) {
            agent.delete('/api/books/' + createdBookID).type('json')
            .then(res => {
                done();
            })
            .catch(err => done(err));
        });

    });
    
});