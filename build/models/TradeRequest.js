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
                TradeRequest.belongsToMany(models.BookCopy, { as: "BooksOffered", through: "tradeOfferDetails" });
            }
        }
    });
    return TradeRequest;
};
