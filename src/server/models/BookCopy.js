module.exports = function (sequelize, DataTypes) {
    let BookCopy = sequelize.define('bookCopy', {
        available: { type: DataTypes.BOOLEAN }
    }, {
        classMethods: {
            associate: function (models) {
                console.log("Associating BookCopy Model");
                BookCopy.belongsTo(models.User);
                BookCopy.belongsTo(models.Book);
                BookCopy.hasMany(models.TradeRequest);
            }
        }
    });
    return BookCopy;
};