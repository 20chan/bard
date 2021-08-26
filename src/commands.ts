import * as discord from 'discord.js';
import * as voice from '@discordjs/voice';
import { logger } from './logger';
import { streamMusic } from './commands/music';

export type CommandFunction = (message: discord.Message) => Promise<void>;
export type CommandRegister = {
  head: string;
  handler: CommandFunction;
};

let connection: voice.VoiceConnection | null = null;
const player = voice.createAudioPlayer();

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
  connection = voice.joinVoiceChannel({
    guildId: voiceChannel.guildId,
    channelId: voiceChannel.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });
  connection.subscribe(player);
};

const leaveVoice: CommandFunction = async (message) => {
  if (!connection) {
    return;
  }

  connection.destroy();
  await message.channel.send('leaved channel');
};

const play: CommandFunction = async (message) => {
  if (!connection) {
    return;
  }
  // 일단은 돌아가게
  const url = message.content.split(' ')[1];

  logger.info(`enter voice state:ready ${url}`);
  await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 20e3);
  logger.info(`start play ${url}`);
  const source = await streamMusic(url);
  player.play(source);

  logger.info(`end play ${url}`);
}

const stop: CommandFunction = async (message) => {
  player.stop();
  await message.channel.send('stopped');
};

const pause: CommandFunction = async (message) => {
  player.pause();
  await message.channel.send('paused');
};

const resume: CommandFunction = async (message) => {
  player.unpause();
  await message.channel.send('resumed');
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
  {
    head: 'leave',
    handler: leaveVoice,
  },
  {
    head: 'play',
    handler: play,
  },
  {
    head: 'stop',
    handler: stop,
  },
  {
    head: 'pause',
    handler: pause,
  },
  {
    head: 'resume',
    handler: resume,
  },
];