import { MessageEmbed } from "discord.js";
import { VideoSearchResult } from "yt-search";

export function MusicOptionsField(arr: VideoSearchResult[]) {
    const message = new MessageEmbed();
    message.setColor('BLUE');
    message.setTitle("Please select a track with the /music play command");
    message.setDescription("Example : /music play 1");

    arr.forEach((e, i) => {
        message.addField(`${i+1}. ${e.title}`, `Youtube : ${e.url}`);
    });

    return message;
}