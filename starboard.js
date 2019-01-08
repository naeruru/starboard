/*
 * Starboard discord bot written in nodejs: react to posts and have it post to a pin
 * channel after a configurable threshhold. originally meant for moonmoon_ow discord server.
 * Developed by Rushnett and Keiaxx.
 */

// discord init
const Discord = require("discord.js");
const client = new Discord.Client();

// is message posted object
let messagePosted = {};
// emoji that goes in the post title
const tt = ":star:";

let settings;
let guildID = "";
let smugboardID = "";

try {
  settings = require("./settings.json");
} catch (e) {
  console.log("a settings.json file has not been generated." + e.stack);
  process.exit();
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.username}!`);
  guildID = settings.serverID;
  smugboardID = settings.channelID;
});

client.on('messageReactionAdd', (reaction, user) => {
  // if channel is posting channel
  if (reaction.message.channel.id == smugboardID) return;
  //if message is from bot
  if (reaction.message.author.username == client.user.username) return;
  // if reaction is not desired emoji
  if (reaction.emoji.name !== settings.reactionEmoji) return;

  const msg = reaction.message;
  const msgID = msg.id;
  const msgChannelID = msg.channel.id;
  const channel = client.guilds.get(guildID).channels.get(smugboardID);
  const channelID = channel.id;
  let eURL;

  console.log("message " + settings.reactionEmoji + "'d! (" + msgID + ")");

  // if message doesnt exist yet in memory, create it
  if (!messagePosted.hasOwnProperty(msgID)) {
    messagePosted[msgID] = {
      posted: false,
      latestCount: 0
    };
  }

  // did message reach threshold
  if (reaction.count >= settings.threshold) {
    messagePosted[msgID].latestCount = reaction.count;
    // if message is already posted
    if (messagePosted[msgID].hasOwnProperty("psm")) {
      let editableMessageID = messagePosted[msgID].psm;
      console.log("updating count of message with ID " + editableMessageID + ". reaction count: " + reaction.count);
      channel.fetchMessage(editableMessageID).then(message => {
        message.edit(tt + '  **' + reaction.count + '** ' + '<#' + msgChannelID + '> (' + msgID + ')');
      });
    } else {
      // if message has already been created
      if (messagePosted[msgID].posted) return;

      console.log("posting message with content ID " + msgID + ". reaction count: " + reaction.count);
      // add message to ongoing object in memory
      messagePosted[msgID].posted = true;
      // header of star post =>
      channel.sendMessage(tt + '  ' + reaction.count + ' ' + '<#' + msgChannelID + '> (' + msgID + ')').then(message => {
        messagePosted[msgID].psm = message.id;

        const embeds = msg.embeds;
        const attachments = msg.attachments;

        // look for image imbeds from links
        if (embeds.length > 0) {
          // attempt to resolve image url; if none exist, ignore it
          try {
            eURL = embeds[0].thumbnail.url;
          } catch (e) {
            console.log("error resolving thumbnail image. ignoring it.")
            eURL = embeds[0].url;
          }
          console.log(eURL);
          const embed = new Discord.RichEmbed().setAuthor(msg.author.username, msg.author.avatarURL).setColor(0x00AE86).setDescription(msg.content).setImage(eURL).setTimestamp(new Date());
          channel.sendEmbed(embed);

          // look for image attachments
        } else if (attachments.array().length > 0) {
          let attARR = attachments.array();

          eURL = attARR[0].url;

          const embed = new Discord.RichEmbed().setAuthor(msg.author.username, msg.author.avatarURL).setColor(0x00AE86).setDescription(msg.content).setImage(eURL).setTimestamp(new Date());
          channel.sendEmbed(embed);

          // no attachments or embeds
        } else {
          const embed = new Discord.RichEmbed().setAuthor(msg.author.username, msg.author.avatarURL).setColor(0x00AE86).setDescription(msg.content).setTimestamp(new Date());
          channel.sendEmbed(embed);
        }

        channel.fetchMessage(message.id).then(message => {
          message.edit(tt + '  **' + messagePosted[msgID].latestCount + '** ' + '<#' + msgChannelID + '> (' + msgID + ')');
        });
      });
    }
  }
});

// log in
if (settings.token) {
  console.log("Logging in with token...");
  client.login(settings.token);
} else {
  console.log("Error logging in: There may be an issue with you settings.json file");
}
