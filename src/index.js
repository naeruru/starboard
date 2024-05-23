/*
 * Starboard discord bot written in nodejs: react to posts and have it post to a pin
 * channel after a configurable threshhold. originally meant for moonmoon_ow discord server.
 * Original version developed by naeruru and Keiaxx.
 */

// discord init
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ChannelType, WebhookClient } = require('discord.js')
const client = new Client({
  partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent]
})

let settings
let db
let guildID = ''
let smugboardID = ''
let postChannel
let webhook
const messagePosted = {}
let loading = true

const MAXLENGTH = 4000

function setup () {
  // load settings.json
  try {
    settings = require('../config/settings.json')
  } catch (e) {
    console.log(`a settings.json file has not been generated. ${e.stack}`)
    process.exit()
  }

  if (settings.sql)
    db = require('./database/sequelize')

  if (!settings.embedEmoji)
    settings.embedEmoji = '⭐'

  // login to discord
  if (settings.token) {
    console.log('Logging in with token...')
    client.login(settings.token)
  } else {
    console.log('Error logging in: There may be an issue with you settings.json file')
  }
}

// takes a discordjs data structure
// fetches full structure if partial
function fetchStructure(structure) {
  return new Promise((resolve, reject) => {
    if (structure.partial || structure.count <= 1) {
      structure.fetch()
        .then((structure) => resolve(structure))
        .catch((error) => reject(error))
    } else {
      resolve(structure)
    }
  })
}

async function * messagesIterator (channel, messagesLeft) {
  let before = null
  let done = false
  while (messagesLeft > 0) {
    process.stdout.write(".")
    const messages = await channel.messages.fetch({ limit: (messagesLeft < 100) ? messagesLeft : 100, before })
    if (messages.size > 0) {
      before = messages.lastKey()
      messagesLeft = messagesLeft - 100
      yield messages
    } else break
  }
}

async function * loadMessages (channel, amount) {
  for await (const messages of messagesIterator(channel, amount)) {
    for (const message of messages.values()) yield message
  }
}

// load old messages into memory
async function loadIntoMemory () {
  const channel = client.guilds.cache.get(guildID).channels.cache.get(smugboardID)
  let amount = settings.fetchLimit
  console.log(`Fetching the last ${amount} messages...`)

  // iterate through all messages as they're pulled
  for await (const message of loadMessages(channel, amount)) {
    // verify footer exists and grab original message ID
    if (message.embeds.length > 0 && message.embeds[0].footer) {
      const footerID = String(message.embeds[0].footer.text).match(/\((\d{18,})\)/)
      if (footerID) {
        // save post to memory
        messagePosted[footerID[1]] = message.id // starboard msg id
      }
    }
  }
  loading = false
  console.log(`\nLoaded ${Object.keys(messagePosted).length} previous posts in ${settings.reactionEmoji} channel!`)
}

// construct json object for embed fields
async function buildEmbedFields(reaction) {
  const msg = reaction.message

  // create content data
  const data = {
    content: msg.content,
    contentInfo: '',
    avatarURL: msg.author.displayAvatarURL({ dynamic: true }),
    // imageURL: '',
    imageURLs: [],
    footer: `${reaction.count} ${settings.embedEmoji} (${msg.id})`
  }

  // add msg origin info to content prop
  const msgLink = `https://discordapp.com/channels/${msg.guild.id}/${msg.channel.id}/${msg.id}`
  const threadTypes = [ChannelType.AnnouncementThread, ChannelType.PublicThread, ChannelType.PrivateThread]
  const channelLink = (threadTypes.includes(msg.channel.type)) ? `<#${msg.channel.parent.id}>/<#${msg.channel.id}>` : `<#${msg.channel.id}>`
  data.contentInfo += `\n\n→ [original message](${msgLink}) in ${channelLink}`

  // resolve reply message
  if (msg.reference?.messageId) {
    await msg.channel.messages.fetch(msg.reference.messageId).then(message => {
      // construct reply comment
      let replyContent = (!message.content && message.attachments.size) ? message.attachments.first().name : message.content.replace(/\n/g, ' ')
      replyContent = (replyContent.length > 300) ? `${replyContent.substring(0, 300)}...` : replyContent
      data.content = (msg.content) ? `\n\n${data.content}`: data.content
      data.content = `> ${msg.mentions.repliedUser}: ${replyContent}${data.content}`
    }).catch(err => {
      console.error(`error getting reply msg: ${msg.reference.messageId} (for ${msg.id})\n${err}`)
    })
  }

  // resolve any embeds and images
  if (msg.embeds.length) {
    const imgs = msg.embeds
      .filter(embed => embed.thumbnail || embed.image)
      .map(embed => (embed.thumbnail) ? embed.thumbnail.url : embed.image.url)

    if (imgs.length) {
      // data.imageURL = imgs[0]
      data.imageURLs = imgs

      // site specific gif fixes
      data.imageURLs.forEach((url, i) => {
        data.imageURLs[i] = data.imageURLs[i].replace(/(^https:\/\/media.tenor.com\/.*)(AAAAe\/)(.*)(\.png|\.jpg)/, "$1AAAAC/$3.gif")
      })
    }

    // twitch clip check
    const videoEmbed = msg.embeds.filter(embed => embed.data.type === 'video')[0]
    if (videoEmbed && videoEmbed.data.video.url.includes("clips.twitch.tv")) {
      data.contentInfo += `\n⬇️ [download clip](${videoEmbed.data.thumbnail.url.replace("-social-preview.jpg", ".mp4")})`
    }
    if (videoEmbed && videoEmbed.data.url.includes("clips.fxtwitch.tv")) {
      data.content = data.content.replace(/((https:\/\/)(clips.fxtwitch.tv\/)(?:[?:=a-zA-Z0-9_-]*))/, `\n\n> ${videoEmbed.data.description} \n $1`)
      data.contentInfo += `\n⬇️ [download clip](${videoEmbed.data.video.url})`
    }

    // message is entirely an embed (bot msg)
    if (msg.content === '') {
      const embed = msg.embeds[0]
      if (embed.description) {
        data.content += embed.description
      } else if (embed.fields && embed.fields[0].value) {
        data.content += embed.fields[0].value
      }
    }
  }
  if (msg.attachments.size) {
    // data.imageURL = msg.attachments.first().url
    msg.attachments.each(attachment => {
      data.imageURLs.push(attachment.url)
      data.contentInfo += `\n📎 [${attachment.name}](${attachment.url})`
    })
  }

  // max length message
  if (data.content.length > MAXLENGTH - data.contentInfo.length)
    data.content = `${data.content.substring(0, MAXLENGTH - data.contentInfo.length)}...`
  
  return data
}

// update embed
async function editEmbed(reaction, editableMessageID, forceUpdate=false) {
  if (reaction.count) console.log(`updating count of message with ID ${editableMessageID}. reaction count: ${reaction.count}`)

  try {
    const message = await postChannel.messages.fetch(editableMessageID)

    // rebuild embeds
    const origEmbed = message.embeds[0]
    if (!origEmbed) throw `original embed could not be fetched`

    const messageFooter = (reaction.count) ? `${reaction.count} ${settings.embedEmoji} (${reaction.message.id})` : origEmbed.footer.text

    let updatedEmbeds = [
      EmbedBuilder.from(origEmbed)
        .setFooter({ text: messageFooter, iconURL: null })
    ]
    if (forceUpdate) {
      const data = await buildEmbedFields(reaction)
      const first_image = (data.imageURLs.length) ? data.imageURLs.shift() : null
      updatedEmbeds[0]
        .setDescription(data.content + data.contentInfo)
        .setURL(first_image)
        .setImage(first_image)
      data.imageURLs.forEach(url => {
        updatedEmbeds.push(new EmbedBuilder().setURL(first_image).setImage(url))
      })
    } else {
      updatedEmbeds = updatedEmbeds.concat(message.embeds.slice(1))
    }

    let starMessage
    if (message.webhookId) {
      starMessage = await webhook.editMessage(message.id, { embeds: updatedEmbeds })
    } else {
      starMessage = await message.edit({ embeds: updatedEmbeds })
    }

    if (db)
      db.updatePost(starMessage, reaction.message, reaction.count, starMessage.embeds[0].image)

  } catch (err) {
    console.error(`error updating post: ${editableMessageID}\noriginal message: ${reaction.message.id}\n${err}`)
  }
}

// manage the message board on reaction add/remove
async function manageBoard (reaction) {
  const msg = reaction.message

  // if message is older than set amount
  const dateDiff = (new Date()) - msg.createdAt
  const dateCutoff = 1000 * 60 * 60 * 24
  if (Math.floor(dateDiff / dateCutoff) >= settings.dateCutoff) {
    console.log(`a message older than ${settings.dateCutoff} days was reacted to, ignoring`)
    return
  }

  console.log(`message ${settings.reactionEmoji}'d! (${msg.id}) in #${msg.channel.name} total: ${reaction.count}`)

  // did message reach threshold
  if (reaction.count >= settings.threshold) {
    // if message is already posted
    if (messagePosted[msg.id]) {
      const editableMessageID = messagePosted[msg.id]
      if (editableMessageID === true) return // message not yet posted (too fast)

      editEmbed(reaction, editableMessageID, forceUpdate=false)

    } else {
      console.log(`posting message with content ID ${msg.id}. reaction count: ${reaction.count}`)

      // add message to ongoing object in memory
      messagePosted[msg.id] = true

      const data = await buildEmbedFields(reaction)
      
      // set first image
      const first_image = (data.imageURLs.length) ? data.imageURLs.shift() : null
      // set message embed color
      const hexcolor = settings.hexcolor ?? parseInt(msg.channel.id).toString(16).substring(2, 8)

      // attach all embeds
      const embeds =  [
        new EmbedBuilder()
          .setURL(first_image)
          .setAuthor({ name: msg.author.globalName ?? msg.author.username, iconURL: data.avatarURL, url: `https://discordapp.com/users/${msg.author.id}`})
          .setColor(hexcolor)
          .setDescription(data.content + data.contentInfo)
          .setImage(first_image)
          .setTimestamp(new Date())
          .setFooter({ text: data.footer, iconURL: null }),
      ]
      data.imageURLs.forEach(url => {
        embeds.push(new EmbedBuilder().setURL(first_image).setImage(url))
      })

      // post embed
      let starMessage
      try {
        if (webhook) {
          starMessage = await webhook.send({
            username: client.user.username,
            avatarURL: client.user.avatarURL(),
            embeds: embeds
          })
        } else {
          starMessage = await postChannel.send({ embeds: embeds })
        }

        // save message id to memory
        messagePosted[msg.id] = starMessage.id

        if (db)
          db.updatePost(starMessage, msg, reaction.count, starMessage.embeds[0].image)
      } catch (err) {
        console.error(`error reposting msg: ${msg.id}\n${err}`)
      }
    }
  }
}

// delete a post
async function deletePost (msg) {
  // if posted to channel board before
  if (messagePosted[msg.id]) {
    const editableMessageID = messagePosted[msg.id]
    let deletableMessage
    try {
      deletableMessage = await postChannel.messages.fetch(editableMessageID)
      if (deletableMessage.webhookId) {
        await webhook.deleteMessage(editableMessageID)
      } else {
        await deletableMessage.delete()
      }
    } catch(e) {
      console.error(`Error deleting message ${editableMessageID}\n${e}`)
    }

    delete messagePosted[msg.id]
    console.log(`Removed message with ID ${editableMessageID}. Reaction count reached 0.`)
      
    if (db)
      db.setDeleted(editableMessageID)
  }
}

// ON READY
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.username}!`)
  guildID = settings.serverID
  smugboardID = settings.channelID

  if (settings.webhook) webhook = new WebhookClient({ url: settings.webhook })
  postChannel = client.guilds.cache.get(guildID).channels.cache.get(smugboardID)

  // fetch existing posts
  loadIntoMemory()
})

// ON REACTION ADD
client.on('messageReactionAdd', (reaction) => {
  if (loading) return
  // if channel is posting channel
  if (reaction.message.channel.id == smugboardID) return
  // if reaction is not desired emoji
  if (reaction.emoji.name !== settings.reactionEmoji) return

  // check if partial
  fetchStructure(reaction).then((reaction) => {
    manageBoard(reaction)
  }).catch((error) => {
    console.error(`error fetching reaction:\n${error}`)
  })
})

// ON REACTION REMOVE
client.on('messageReactionRemove', (reaction) => {
  if (loading) return
  // if channel is posting channel
  if (reaction.message.channel.id == smugboardID) return
  // if reaction is not desired emoji
  if (reaction.emoji.name !== settings.reactionEmoji) return


  // check if partial
  fetchStructure(reaction).then((reaction) => {
    // if reactions reach 0
    if (reaction.count === 0)
      deletePost(reaction.message)
    else
      manageBoard(reaction)
  }).catch((error) => {
    console.error(`error fetching reaction:\n${error}`)
  })
})

// ON REACTION PURGE
client.on('messageReactionRemoveAll', (msg) => {
  deletePost(msg)
})

// ON REACTION PURGE SINGLE
client.on('messageReactionRemoveEmoji', (msgReaction) => {
  if (msgReaction.emoji.name === settings.reactionEmoji)
    deletePost(msgReaction.message)
})

// if post is deleted (db only)
client.on('messageDelete', (msg) => {
  if (db && msg.channel.id === smugboardID)
    db.setDeleted(msg.id)
})

// if embed was deleted (db only)
client.on('messageUpdate', (oldMsg, newMsg) => {
  if (db && oldMsg.channel.id === smugboardID && oldMsg.embeds.length && !newMsg.embeds.length)
    db.setDeleted(newMsg.id)
  else if (settings.editMsgGracePeriod && messagePosted[newMsg.id]) {
    const dateDiff = (new Date()) - newMsg.reactions.message.createdTimestamp
    const dateCutoff = 1000
    console.log(Math.floor(dateDiff / dateCutoff))
    if (Math.floor(dateDiff / dateCutoff) <= settings.editMsgGracePeriod)
      editEmbed(newMsg.reactions, messagePosted[newMsg.id], forceUpdate=true)
    else
      console.log(`message older than ${settings.editMsgGracePeriod} seconds was edited, ignoring`)
  }
})

setup()