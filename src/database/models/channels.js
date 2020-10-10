module.exports = function (sequelize, DataTypes) {
    return sequelize.define('channels', {
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
        tableName: 'channels',
        timestamps: false
    })
}
