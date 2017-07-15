module.exports = function (sequelize, DataTypes) {
    let TradeRecord = sequelize.define('tradeRecord', {
        shippingInstructions: { type: DataTypes.TEXT }
    }, {
        classMethods: {
            associate: function (models) {
                console.log("Associating TradeRecord model.");
                TradeRecord.belongsTo(models.User, {as: "tradeSender"});
                TradeRecord.belongsTo(models.Book, {as: "tradeSenderBook"});
                TradeRecord.belongsTo(models.User, {as: "tradeReceiver"});
                TradeRecord.belongsTo(models.Book, {as: "tradeReceiverBook"});
            }
        }
    });
    return TradeRecord;
};