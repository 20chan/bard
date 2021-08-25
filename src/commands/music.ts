import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import { raw as ytdl } from 'youtube-dl-exec';

export const streamMusic = (url: string): Promise<AudioResource> => {
  return new Promise((resolve, reject) => {
    const process = ytdl(url, {
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
          metadata: url,
          inputType: probe.type,
        }));
      })
    });
  });

}