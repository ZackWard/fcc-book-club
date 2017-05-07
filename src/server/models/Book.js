module.exports = function (sequelize, DataTypes) {
    let Book = sequelize.define('book', {
        google_id: { type: DataTypes.STRING },
        title: { type: DataTypes.STRING },
        subtitle: { type: DataTypes.STRING },
        authors: { type: DataTypes.STRING },
        description: { type: DataTypes.STRING },
        image: { type: DataTypes.STRING }
    }, {
        classMethods: {
            associate: function (models) {
                console.log("Associating Book Model");
                // Using a 1:m association, because Sequelize doesn't allow multiple copies
                // when using the n:m association
                Book.hasMany(models.BookCopy);
            }
        }
    });
    return Book;
};