# Starboard
Starboard discordjs bot originally created (and still running) for moonmoon_ow discord server. This implementation is a barebones starboard that can work on one discord server with basic features. It certainly isn't the best way to make a starboard but it works well as is.

## Getting Started
### Setup
After cloning the repository, the only setup that needs to be done involves creating a `settings.json` file. The following is an example of how the file needs to look:
```
{
  "token": "bot_token",
  "serverID": "693277318496920420",
  "channelID": "461248569698208129",
  "reactionEmoji": "😄",
  "threshold": 15
}
```
**token:** the discord bot token you get from your discord [developer portal](https://discordapp.com/developers/applications/).

**serverID:** the ID of the server you want the bot to run in. After enabling developer mode, you can right click the server icon to get the server ID.

**channelID:** the ID of the channel you want the starboard bot to post to. You can right click the channel name and obtain the channel ID after enabling developer mode.

**reactionEmoji:** the emoji you want the bot to listen to. For default emojis, use the literal emoji. To easily obtain this, you can put a `\` infront of any emoji name like `\:star:` in discord (which would create ⭐). For custom emojis, simply put the exact name like `moon2SMUG`.

**threshhold:** the amount of reactions it takes for a message to be posted to the starboard.

### Running the Project
Assuming you have node installed, use `npm install` to download dependencies. Finally, you can run the bot from `starboard.js`. I recommend using pm2 for continuous uptime.
## Caveats
The bot will only listen to messages created after the script runs and will ignore any previous messages.

## License
This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.
