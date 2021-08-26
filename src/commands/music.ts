import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import { raw as ytdl } from 'youtube-dl-exec';
import { getInfo } from 'ytdl-core';
import yts from 'yt-search';

export interface Track {
  url: string;
  title: string;
}

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

}