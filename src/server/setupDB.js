export default function (models, force) {

    var testUser, testBook, testCopy1, testCopy2;

    models.sequelize.sync({force: force})
    .then(function () {
        return models.User.create({username: "zack", firstName: "Zack", lastName: "Ward", password: "$2a$10$SAgRTes87TTH8jGD5oFIlO9yCju0dLD0w2afmBXgb6P3x5aCtl9zC"});
    })
    .then(function (user) {
        testUser = user;
        return models.Book.create({title: "Eloquent Javascript", image: "http://books.google.com/books/content?id=mDzDBQAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api"});
    })
    .then(function (book) {
        testBook = book;
        // Now, the tricky part. Add two copies of Test Book to Zack-test
        testCopy1 = models.BookCopy.build({available: false});
        testCopy1.setUser(testUser, {save: false});
        testCopy1.setBook(testBook, {save: false});
        return testCopy1.save();
    })
    .then(function () {
        testCopy2 = models.BookCopy.build({available: true});
        testCopy2.setUser(testUser, {save: false});
        testCopy2.setBook(testBook, {save: false});
        return testCopy2.save();
    })
    .then(function () {
        console.log("Done!");
    });
};