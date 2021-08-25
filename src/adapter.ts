import * as discord from 'discord.js';
import * as voice from '@discordjs/voice';

const adapters = new Map<discord.Snowflake, voice.DiscordGatewayAdapterLibraryMethods>();
const trackedClients = new Set<discord.Client>();
const testAdapter = (channel: discord.VoiceChannel): voice.DiscordGatewayAdapterCreator => {
  return methods => {
    adapters.set(channel.guild.id, methods);
    return {
      sendPayload: (data) => {
        if (channel.guild.shard.status === discord.Constants.Status.READY) {
          channel.guild.shard.send(data);
          return true;
        }
        return false;
      },
      destroy: () => {
        return adapters.delete(channel.guildId);
      }
    }
  }
}
