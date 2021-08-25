import * as discord from 'discord.js';
import dotenv = require('dotenv');
import { commands } from './commands';
import { logger } from './logger';

dotenv.config();

const client = new discord.Client({
  intents: [
    discord.Intents.FLAGS.GUILDS,
    discord.Intents.FLAGS.GUILD_MESSAGES,
    discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    discord.Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.on('ready', () => {
  logger.info('ready to roll');
});

client.on('messageCreate', async message => {
  if (!message.member) {
    return;
  }
  if (message.content.startsWith('`')) {
    const content = message.content.substr(1);

    const command = commands.filter(x => content.startsWith(x.head))?.[0];
    if (command) {
      logger.info('got message', {
        command,
        fullCommand: message.content,
        from: message.member?.user?.username,
        fromNickname: message.member?.nickname,
      });
      await command.handler(message);
    }
  }
});

client.login(process.env.BOT_TOKEN);