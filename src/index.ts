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

    const command = commands.filter(x => {
      const heads = typeof x.head === 'string' ? [x.head] : x.head;
      return heads.some(y => {
        if (content.toLowerCase().startsWith(y.toLowerCase())) {
          const next = content.substr(y.length)[0];
          if (next === undefined || next === ' ') {
            return true;
          }
        }
        return false;
      });
    })?.[0];
    if (command) {
      logger.info('got message', {
        command,
        fullCommand: message.content,
        from: message.member?.user?.username,
        fromNickname: message.member?.nickname,
      });
      try {
        await command.handler(message);
      } catch (e) {
        logger.error('error while executing command', e);
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);