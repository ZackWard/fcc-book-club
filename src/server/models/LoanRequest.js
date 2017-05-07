module.exports = function (sequelize, DataTypes) {
    let LoanRequest = sequelize.define('loanRequest', {
        // Statuses: Requested --> Lent -> Returned -> Received 
        //                     \-> Declined
        status: { type: DataTypes.STRING }
    }, {
        classMethods: {
            associate: function (models) {
                console.log("Associating LoanRequest model.");
                LoanRequest.belongsTo(models.User);
                LoanRequest.belongsTo(models.BookCopy);
            }
        }
    });
    return LoanRequest;
};