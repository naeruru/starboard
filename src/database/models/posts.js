module.exports = function (sequelize, DataTypes) {
    return sequelize.define('posts', {
        id: {
            type: DataTypes.STRING(),
            primaryKey: true,
            allowNull: false,
        },
        channelId: {
            type: DataTypes.STRING(),
            allowNull: false,
            references: {
                model: 'channels',
                key: 'id'
            }
        },
        userId: {
            type: DataTypes.STRING(),
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        msgId: {
            type: DataTypes.STRING(),
            allowNull: false
        },
        reactions: {
            type: DataTypes.INTEGER(),
            allowNull: false
        },
        msgContent: {
            type: DataTypes.TEXT(),
            allowNull: true,
        },
        msgAttachment: {
            type: DataTypes.TEXT(),
            allowNull: true,
        },
        date: {
            type: DataTypes.DATE(),
            allowNull: false,
        },
        deleted: {
            type: DataTypes.BOOLEAN(),
            allowNull: false,
            defaultValue: false,
        },
    }, {
        tableName: 'posts',
        timestamps: false
    })
}
