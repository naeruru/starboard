# Starboard
Starboard (also known as the smugboard™) is a Discordjs bot originally created (and still running) for moonmoon's discord server. It allows users to react to messages on a given server, and pin messages that reach a threshold to a special channel. This implementation is a barebones starboard that can work on one discord server with minimal setup. No databases are required.

## Getting Started
### Requirements
- NodeJS 16.9.0+
- Enable Discord "Message Content Intent" (in Discord App/Bot settings)
### Setup
Create a [Discord application](https://discord.com/developers/applications) bot, and enable **Message Content Intent** under the **Privilieged Gateway Intents** section in the **bot** tab. This is required for your application to be able to view message content.

After creating your bot and cloning the repository, the only setup that needs to be done involves creating a `settings.json` file in the config folder. The following is an example of how the file needs to look:
```
{
  "token": "bot_token",
  "serverID": "693277318496920420",
  "channelID": "461248569698208129",
  "reactionEmoji": "⭐",
  "embedEmoji": "⭐",
  "threshold": 15,
  "hexcolor": "00AE86",
  "dateCutoff": 3,
  "fetchLimit": 100
}
```

| PROP | TYPE| INFO |
|--|--|--|
| **token** | String | the discord bot token you get from your discord [developer portal](https://discordapp.com/developers/applications/). |
| **serverID** | String | the ID of the server you want the bot to run in. After enabling developer mode, you can right click the server icon to get the server ID. |
| **channelID** | String | the ID of the channel you want the starboard bot to post to. You can right click the channel name and obtain the channel ID after enabling developer mode. |
| **reactionEmoji** | String | the emoji you want the bot to listen to. For default emojis, use the literal emoji. To easily obtain this, you can put a `\` infront of any emoji name like `\:star:` in discord (which would create ⭐). For custom emojis, simply put the exact name like `moon2SMUG`. |
| **embedEmoji** | String | the emoji (Or any other piece of text) displayed at the bottom of the embeds in the starboard channel. |
| **threshhold** | Integer | the amount of reactions it takes for a message to be posted to the starboard. |
| **hexcolor** | String | the color of the embed in hex. |
| **dateCutoff** | Integer | how old a message can be, in days, and still be tracked by the bot. if you don't want really old messages getting posted, then keep this number low. |
| **fetchLimit** | Integer | how many messages from the starboard channel will be loaded in memory. This lets the script know what messages have already been posted. It's recommended to change this with respect to `dateCutoff` and how big your server is. Anything that isn't tracked has the possibility of getting double posted. |


### Running the Project
Use `npm install` to download dependencies. Finally, you can run the bot with `npm start`. I recommend using pm2 for continuous uptime.

## Database Support
Using a database is completely optional, but if you wish to use one, it is partially supported. All you need to do is add the property `sql` to your config.json like so:
```
{
  ...
  "sql": {
    "dialect": "mariadb",
    "db": "db_name",
    "hostname": "127.0.0.1",
    "port": "3306",
    "username": "username",
    "password": "password"
  }
  ...
}
```
### Notes
- DB support currently only sends data back to the DB. It will still load previous posts from the actual discord channel, up to the amount specified in the config.

- All code is tested with the dialect mariadb. Additional dialects must be installed. For example, if you want to use `"dialect": "mysql"`, you must install it with `npm install mysql2`.

## License
This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.
