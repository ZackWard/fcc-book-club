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

    before(function (done) {
        // Empty the database
        db.sequelize.sync({force: true})
        .then(() => done())
        .catch(error => done(error));
    });

    describe("Users", function () {

        describe("Create (POST)", function () {

            let userData = {
                username: 'zack2',
                password: 'zack2'
            };

            it("Should create a user if given valid input", function (done) {
                chai.request(server).post('/api/users').send(userData)
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

        describe("Login", function () {
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
        });

        describe("Update (PATCH)", function () {

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

        describe("Logout", function () {
            it("Should log the current user off", function (done) {
                chai.request(server).get('/api/users/logout')
                .then(res => {
                    expect(res).to.be.status(200);
                    expect(res).to.be.json;
                    expect(res.header['set-cookie']).to.equal(undefined);
                    done();
                })
                .catch(error => done(error));
            });
        });

    });

    describe("Books", function () {

        let newBook = {
            id: "google",
            title: "Test Book",
            subtitle: "A book that is a test, not a book about testing",
            authors: "Somebody",
            description: "This is a test entry",
            image: "http://www.zackward.net/blah.jpg"
        };

        describe("Create", function () {
            it("Should create a book", function (done) {
                agent.post('/api/books').send(newBook)
                .then(res => {
                    expect(res).to.have.a.status(200);
                    expect(res).to.be.json;
                    done();
                })
                .catch(error => done(error));
            });
        });

        describe("Read", function () {

            // Add another user, give them a couple of books
            before(function (done) {
                let makeUser = db.User.create({username: "fakeuser"});
                let makeBook = db.Book.create({title: "Fake Book"});
                Promise.all([makeUser, makeBook])
                .then(([user, book]) => {
                    let book1 = db.BookCopy.build({available: true});
                    let book2 = db.BookCopy.build({available: false});
                    book1.setUser(user, {save: false});
                    book1.setBook(book, {save: false});
                    book2.setUser(user, {save: false});
                    book2.setBook(book, {save: false});
                    return Promise.all([book1.save(), book2.save()]);     
                })
                .then(([book1, book2]) => {
                    done();
                })
                .catch(err => done(err));
            });

            it("Should return a list of books", function (done) {
                agent.get('/api/books')
                .then(res => {
                    console.log(JSON.stringify(res.body));
                    expect(res).to.be.status(200);
                    expect(res).to.be.json;
                    expect(Array.isArray(res.body)).to.be.true;
                    done();
                })
                .catch(err => done(err));
            });

            it("Should optionally return a list of books owned by a given user", function (done) {
                agent.get('/api/books?owner=zack2')
                .then(res => {
                    console.log(JSON.stringify(res.body));
                    expect(res).to.be.status(200);
                    expect(res).to.be.json;
                    expect(Array.isArray(res.body)).to.be.true;
                    let incorrectEntries = res.body.filter(book => book.owner != "zack2");
                    expect(incorrectEntries).to.have.lengthOf(0);
                    done();
                })
                .catch(err => done(err));
            });

            it("Should optionally include loan request data", function (done) {
                done(new Error("Not implemented"));
            });
        });

        describe("Update", function () {
            it("Should update a book", function (done) {
                done(new Error("Not implemented"));
            });
        });

        describe("Delete", function () {
            it("Should delete a book", function (done) {
                done(new Error("Not implemented"));
            });
        });

        describe("Loan Requests Subresource", function () {

            describe("Create", function () {

                it("Should create a new Loan Request", function (done) {
                    done(new Error("Not implemented"));
                });

            });

            describe("Read", function () {

                it("Should return a list of book requests", function (done) {
                    done(new Error("Not implemented"));
                });

            });

            describe("Update", function () {

                it("Should update a loan request", function (done) {
                    done(new Error("Not implemented"));
                });

            });

            describe("Delete", function () {

                it("Should delete a loan request", function (done) {
                    done(new Error("Not implemented"));
                });

            });
        });
    });
});