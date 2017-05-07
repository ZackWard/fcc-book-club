module.exports = function (sequelize, DataTypes) {
    let User = sequelize.define('user', {
        username: {
            type: DataTypes.STRING,
            required: true,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            required: true
        },
        firstName: {
            type: DataTypes.STRING,
            field: 'first_name'
        },
        lastName: {
            type: DataTypes.STRING,
            field: "last_name"
        },
        city: {
            type: DataTypes.STRING
        },
        state: {
            type: DataTypes.STRING
        }
    }, {
        classMethods: {
            associate: function (models) {
                console.log("Associating User Model");
                // Using a 1:m association, because Sequelize doesn't allow multiple copies
                // when using the n:m association
                User.hasMany(models.BookCopy);
                User.hasMany(models.LoanRequest);
            }
        }
    });
    return User;
};