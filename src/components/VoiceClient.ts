// node module dependencies
import { Guild } from "discord.js";
import { joinVoiceChannel, VoiceConnection } from "@discordjs/voice";

export async function joinUserChannel(userID: string, guild: Guild): Promise<VoiceConnection | null> {
    const user = await guild.members.fetch(userID);
    if(user.voice.channel) {
        return await joinChannel(user.voice.channel.id, guild);
    }
    else return null;
}

export async function joinChannel(channelID: string, guild: Guild): Promise<VoiceConnection | null> {
    const channel = await guild.channels.fetch(channelID);
    if(channel && channel.isVoice()) {
        return joinVoiceChannel({
            channelId: channelID,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });
    }
    else return null;
}