module.exports = function (sequelize, DataTypes) {
    return sequelize.define('users', {
        id: {
            type: DataTypes.STRING(),
            primaryKey: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(),
            allowNull: false
        },
    }, {
        tableName: 'users',
        timestamps: false
    })
}
