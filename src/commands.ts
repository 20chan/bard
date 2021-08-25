import * as discord from 'discord.js';
import * as voice from '@discordjs/voice';
import { logger } from './logger';

export type CommandFunction = (message: discord.Message) => Promise<void>;
export type CommandRegister = {
  head: string;
  handler: CommandFunction;
};

const debugVoiceState: CommandFunction = async (message) => {
  const cache = message.member!.guild.voiceStates.cache;
  const data = JSON.stringify(cache.map((v, k) => ({
    guild: v.guild.name,
    channel: v.channel?.name,
    memeber: v.member?.nickname,
  })));
  await message.channel.send(`\`\`\`\n${data}\n\`\`\``);
};

const joinVoice: CommandFunction = async (message) => {
  const member = message.member;

  if (!member) {
    logger.info('member fetch failed', message);
    return;
  }

  const channelId = member.voice?.channelId;
  if (!channelId) {
    await message.channel.send('youre not in voice channel');
    return;
  }
  const voiceChannel = await member.guild.channels.fetch(channelId) as discord.VoiceChannel | null;
  if (!voiceChannel) {
    await message.channel.send('youre not in voice channel');
    return;
  }

  logger.info(`joined channel ${voiceChannel.name}`);
  voice.joinVoiceChannel({
    guildId: voiceChannel.guildId,
    channelId: voiceChannel.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });
};

export const commands: CommandRegister[] = [
  {
    head: '`d vc',
    handler: debugVoiceState,
  },
  {
    head: 'join',
    handler: joinVoice,
  },
];