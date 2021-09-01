import { AudioResource, createAudioResource, demuxProbe, createAudioPlayer, AudioPlayerStatus } from '@discordjs/voice';
import { raw as ytdl } from 'youtube-dl-exec';
import { getInfo } from 'ytdl-core';
import yts from 'yt-search';
import { logger } from '../logger';

export interface Track {
  url: string;
  title: string;
}

type Loop = {
  start: number;
  end: number;
} | null;

export const parseTrack = async (query: string): Promise<Track> => {
  const prefixes = [
    'https://',
    'http://',
    'www.',
    'youtube.',
    'music.',
  ];
  if (prefixes.some(x => query.startsWith(x))) {
    const info = await getInfo(query);
    return {
      url: query,
      title: info.videoDetails.title,
    };
  } else {
    const r = await yts(query);
    return {
      url: r.videos[0].url,
      title: r.videos[0].title,
    };
  }
}

export const streamMusic = (track: Track): Promise<AudioResource> => {
  return new Promise((resolve, reject) => {
    const process = ytdl(track.url, {
      o: '-',
      q: '',
      f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
      r: '100K',
    }, {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const stream = process.stdout;
    if (!stream) {
      reject(new Error('no stdout'));
      return;
    }

    process.once('spawn', () => {
      demuxProbe(stream).then(probe => {
        resolve(createAudioResource(probe.stream, {
          metadata: track,
          inputType: probe.type,
        }));
      })
    });
  });
};

const createPlayer = () => {
  const player = createAudioPlayer();
  player.on('stateChange', (oldState, newState) => {
    logger.info(`player state changed: ${oldState.status} to ${newState.status}`);
    if (newState.status === AudioPlayerStatus.Idle
      && oldState.status !== AudioPlayerStatus.Idle) {
        if (playing) {
          index += 1;
          if (loop) {
            if (index >= loop.end) {
              index = loop.start;
            }
          }
          process();
        }
    }
  });
  return player;
};

export const next = async () => {
  playing = true;
  // 믿기지 않지만 stateChange로 넘어가서 알아서 다음곡이 재생된다
  player.stop();
};

export const enqueue = (track: Track) => {
  queue.push(track);
};

export const start = async () => {
  playing = true;
  if (player.state.status !== AudioPlayerStatus.Playing) {
    await process();
  }
};

export const stop = async () => {
  index = queue.length;
  playing = false;
  player.stop();
}

const process = async () => {
  const track = queue[index];
  if (!track) {
    return;
  }
  const source = await streamMusic(track);
  player.play(source);
};

export const isPlaying = () => {
  return player.state.status === AudioPlayerStatus.Playing;
}

export const setLoop = (value: Loop) => {
  loop = value;
};

export const player = createPlayer();
export const queue: Track[] = [];
export let index: number = 0;
export let playing = false;
export let loop: Loop = null;
