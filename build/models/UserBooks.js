module.exports = function (sequelize, DataTypes) {
    var UserBooks = sequelize.define('userBooks', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        status: { type: DataTypes.STRING }
    });
    return UserBooks;
};
