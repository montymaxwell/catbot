import { join } from "path";
import { VideoMetadataResult } from "yt-search";
import { ApplicationCommandData, MessageEmbed } from "discord.js";
import { AudioPlayerStatus, createAudioPlayer } from "@discordjs/voice";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";

import { pop } from "../utils/Array";
import { VideoMetadata } from "../types";
import { FormatToYoutubeURL, getLocalAudioStream, getYoutubeMetadata } from "../components/AudioHandlers";

export interface Video { url: string, info: VideoMetadata };
export const streams: Video[] = [];
export let lastTrack: Video | null;

export const MusicCommands: ApplicationCommandData[] = [
    {
        name: 'music',
        description: 'make contact with MiloTheDJCat',
        options: [
            {
                name: 'play',
                type: ApplicationCommandOptionTypes.SUB_COMMAND,
                description: 'plays a song',
                options: [
                    {
                        name: 'song',
                        description: 'enter a youtube link or song title',
                        type: ApplicationCommandOptionTypes.STRING
                    }
                ]
                
            },
            {
                name: 'pause',
                type: ApplicationCommandOptionTypes.SUB_COMMAND,
                description: 'pauses the current track',
            },
            {
                name: 'current',
                type: ApplicationCommandOptionTypes.SUB_COMMAND,
                description: 'displays the current track',
            },
            {
                name: 'stop',
                type: ApplicationCommandOptionTypes.SUB_COMMAND,
                description: 'stops the current track',
            },
            {
                name: 'skip',
                type: ApplicationCommandOptionTypes.SUB_COMMAND,
                description: 'skips the current track'
            }
        ]
    }
];

export function MusicPlayer() {
    const Player = createAudioPlayer();
    Player.on(AudioPlayerStatus.Idle, async() => {
        if(streams.length > 0) {
            await Load_LocalAudioStream();
            return;
        }
        else {
            lastTrack = null;
            return;
        }
    });

    const Queue = async(input: string) => {
        const url = await FormatToYoutubeURL(input);
        const info = getShortMetaData(await getYoutubeMetadata(url));
        streams.push({ url, info });
        
        if(Player.state.status == AudioPlayerStatus.Idle) {
            await Load_LocalAudioStream();
            return;
        }
    }

    const Load_LocalAudioStream = async() => {
        const data = pop<Video>(streams);
        if(data) {
            lastTrack = data;
            const stream = await getLocalAudioStream(data.url, join(__dirname, '../../playback.mp3'));
            Player.play(stream);
            return;
        }
    }

    return { Player, Queue };
}

export function PlayerEmbed(data: VideoMetadata) {
    const message = new MessageEmbed();
    message.setColor('BLUE');
    message.setTitle(`🎶 ${data.title} 🎶`);
    message.setImage(data.image);

    message.addFields(
        { name: 'Views', value: data.views.toString(), inline: true },
        { name: 'Duration', value: data.timestamp, inline: true },
        { name: 'Upload Date', value: data.uploadDate, inline: true }
    )

    message.setFooter({
        text: data.url
    });

    return message;
}

function getShortMetaData(data: VideoMetadataResult): VideoMetadata {
    return {
        title: data.title,
        url: data.url,
        views: data.views,
        timestamp: data.timestamp,
        uploadDate: data.uploadDate,
        image: data.image
    }
}