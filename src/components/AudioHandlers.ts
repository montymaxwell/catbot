import yts from "yt-search";
import ytdl from "ytdl-core";
import { createWriteStream } from "fs";
import { AudioResource, createAudioResource, StreamType } from "@discordjs/voice";

export async function FormatToYoutubeURL(input: string) {
    if(input.startsWith('https://www.youtube.com/')) {
        return input;
    }
    else {
        const result = await yts(input);
        const url = result.videos.splice(0, 3)[0].url; // it's going to adopt a list of selection.
        return url;
    }
}

// just a simple hack... not future proof haha.
export function getYoutubeMetadata(url: string) {
    let id: string = url.replace('v=', ' ');
    id = id.replace('&', ' ');
    const videoID = id.split(" ")[1];
    return yts({ videoId: videoID });
}

// no.
export function getLiveAudioStream(url: string) {
    return createAudioResource(ytdl(url, { filter: 'audioonly' }), { inputType: StreamType.Arbitrary });
}

export async function getLocalAudioStream(url: string, path: string): Promise<AudioResource> {
    return new Promise(res => {
        ytdl(url, { filter: 'audioonly' }).pipe(createWriteStream(path)).on('finish', () => {
            res(createAudioResource(path, { inputType: StreamType.Arbitrary }));
        });
    })
}