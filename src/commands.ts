import * as discord from 'discord.js';
import * as voice from '@discordjs/voice';
import { logger } from './logger';
import * as music from './commands/music';

export type CommandFunction = (message: discord.Message) => Promise<void>;
export type CommandRegister = {
  head: string | string[];
  handler: CommandFunction;
};

let connection: voice.VoiceConnection | null = null;

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
  connection.subscribe(music.player);

  await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 20e3);
};

const leaveVoice: CommandFunction = async (message) => {
  if (!connection) {
    return;
  }

  music.queue.length = 0;
  music.setLoop(null);
  connection.destroy();
  await message.channel.send('leaved channel');
};

const play: CommandFunction = async (message) => {
  if (!connection || connection.state.status !== voice.VoiceConnectionStatus.Ready) {
    await joinVoice(message);
  }
  if (!connection) {
    return;
  }
  // 일단은 돌아가게
  const query = message.content.split(' ').splice(1).join(' ');

  logger.info(`enter voice state:ready ${query}`);

  const track = await music.parseTrack(query);
  logger.info('track parsed', track);

  if (music.isPlaying()) {
    await message.channel.send({
      embeds: [
        {
          title: 'now playing',
          description: `[${track.title}](${track.url})`,
        },
      ],
    });
  } else {
    await message.channel.send({
      embeds: [
        {
          title: 'enqueued',
          description: `[${track.title}](${track.url})`,
        },
      ],
    });
  }

  music.enqueue(track);
  logger.info(`queued ${query}`);
  await music.start();

  logger.info(`end play ${query}`);
}

const stop: CommandFunction = async (message) => {
  music.stop();
  music.setLoop(null);
  await message.channel.send('stopped');
};

const pause: CommandFunction = async (message) => {
  music.player.pause();
  await message.channel.send('paused');
};

const resume: CommandFunction = async (message) => {
  music.player.unpause();
  await message.channel.send('resumed');
};

const skip: CommandFunction = async (message) => {
  await music.next();
  await message.channel.send('skipped');
};

const queue: CommandFunction = async (message) => {
  if (music.queue.length === 0) {
    await message.channel.send('queue empty');
    return;
  }

  const prefix = (i: number) => i === music.index ? '>>' : '    ';
  const pad = (x: number) => x.toString().padStart(2, '0');

  const lines = music.queue.map((x, i) => `${prefix(i)}${pad(i)} [${x.title}](${x.url})`);
  const content = lines.join('\n');
  await message.channel.send({
    embeds: [
      {
        title: 'queue',
        description: content,
      },
    ],
  });
};

const loop: CommandFunction = async (message) => {
  if (!connection) {
    await message.channel.send('youre not in voice channel');
    return;
  }
  if (!music.isPlaying) {
    await message.channel.send('not playing');
    return;
  }
  if (music.loop) {
    music.setLoop(null);
    await message.channel.send({
      embeds: [
        {
          title: 'loop',
          description: 'loop off',
        },
      ],
    });
  } else {
    music.setLoop({
      start: music.index,
      end: music.index,
    });
    const current = music.queue[music.index];
    await message.channel.send({
      embeds: [
        {
          title: 'loop',
          description: `loop on: [${current.title}](${current.url})`,
        },
      ],
    });
  }
};

const loopQueue: CommandFunction = async (message) => {
  if (!connection) {
    await message.channel.send('youre not in voice channel');
    return;
  }
  if (!music.isPlaying) {
    await message.channel.send('not playing');
    return;
  }
  if (music.loop && music.loop.end === -1) {
    music.setLoop(null);
    await message.channel.send({
      embeds: [
        {
          title: 'loop queue',
          description: 'loop queue off',
        },
      ],
    });
  } else {
    music.setLoop({
      start: 0,
      end: -1,
    });
    await message.channel.send({
      embeds: [
        {
          title: 'loop queue',
          description: `loop queue on`,
        },
      ],
    });
  }
};

const echo: CommandFunction = async (message) => {
  await message.channel.send({
    embeds: [
      {
        title: 'echo',
        description: JSON.stringify(message.content),
      },
    ],
  });
};

const stat: CommandFunction = async (message) => {
  const tracks = music.queue.map(x => x.title);
  const conn = connection?.state.status ?? 'null';

  const description = [
    `voice status: ${conn}`,
    `player status: ${music.player.state.status}`,
    `index: ${music.index}`,
    `loop: ${JSON.stringify(music.loop)}`,
    `playing: ${music.playing}`,
    `tracks:`,
    tracks.join('\n'),
  ].join('\n');
  
  await message.channel.send({
    embeds: [
      {
        title: 'stat',
        description,
      },
    ],
  });
}

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
    head: ['play', 'p'],
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
  {
    head: 'skip',
    handler: skip,
  },
  {
    head: ['q', 'queue'],
    handler: queue,
  },
  {
    head: ['loop', 'repeat', 'l'],
    handler: loop,
  },
  {
    head: ['loopQueue', 'lq'],
    handler: loopQueue,
  },
  {
    head: 'echo',
    handler: echo,
  },
  {
    head: 'stat',
    handler: stat,
  }
];