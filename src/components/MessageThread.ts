import { Guild, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";

interface ThreadOptions {
    name: string,
    reason: string
    autoArchiveDuration: ThreadAutoArchiveDuration,
}

export async function createMessageThread(guild: Guild, channelID: string, ThreadOptions: ThreadOptions): Promise<ThreadChannel> {
    return new Promise(async(res) => {
        const channel = await guild.channels.fetch(channelID);
        if(channel && channel.isText()) {
            res(await channel.threads.create(ThreadOptions));
        }
    });
}