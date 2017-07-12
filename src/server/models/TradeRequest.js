module.exports = function (sequelize, DataTypes) {
    let TradeRequest = sequelize.define('tradeRequest', {
        status: { type: DataTypes.STRING },
        tradedFor: { type: DataTypes.INTEGER }
    }, {
        classMethods: {
            associate: function (models) {
                console.log("Associating TradeRequest model.");
                TradeRequest.belongsTo(models.User);
                TradeRequest.belongsTo(models.BookCopy);
                TradeRequest.belongsToMany(models.BookCopy, {as: "BooksOffered", through: "tradeOfferDetails"});
            }
        }
    });
    return TradeRequest;
};

// John has "Book A", "Book B", and "Book C."
// Luke has "Book X", "Book Y", and "Book Z."

// John wants Book Z. He offers any of his books for trade.
// Luke chooses Book B. The trade is complete.


