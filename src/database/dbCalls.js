module.exports = {
    updatePost: async function (starPost, msg, reactions, attachment) {

        const post = {
            id: starPost.id,
            channelId: msg.channel.id,
            userId: msg.author.id,
            msgId: msg.id,
            reactions: reactions,
            msgContent: msg.content,
            msgAttachment: (attachment) ? attachment.url : '',
            date: starPost.createdAt ?? new Date(starPost.timestamp).toISOString()
        }

        const channel = {
            id: msg.channel.id,
            name: msg.channel.name
        }

        const user = {
            id: msg.author.id,
            name: msg.author.tag
        }
        
        const [ userRecord, userCreated ] = await Users.upsert(user, { returning: true })
        const [ channelRecord, channelCreated ] = await Channels.upsert(channel, { returning: true })
        const [ postRecord, postCreated ] = await Posts.upsert(post, { returning: true })
        
    },
    setDeleted: async function (messageId) {
        Posts.findOne({ where: { id: messageId } }).then(async post => {
            post.deleted = 1
            await post.save()
            console.log(`[DB] Post with ID ${messageId} was marked deleted`)
        })
    }
}