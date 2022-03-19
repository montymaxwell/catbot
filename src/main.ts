import dotenv from 'dotenv';
import { join } from 'path';

import EventEmitter from 'events';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { AudioPlayerStatus } from '@discordjs/voice';
import { ApplicationCommandData, Client, Intents, ThreadChannel } from 'discord.js';

import { pop } from './utils/Array';
import { Player, Video } from './types';
import { joinUserChannel } from './components/VoiceClient';
import { createMessageThread } from './components/MessageThread';
import { getLocalAudioStream } from './components/AudioHandlers';
import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums';
import { uno_game_commands, UNO_Start } from './systems/minigames/UNO';
import { lastTrack, MusicPlayer, PlayerEmbed, MusicCommands, streams } from './cmd/music';

dotenv.config({ path: join(__dirname, './.env') });
const env = process.env;

export const event = new EventEmitter();
const GameSessions: {[id: string]: {[id: string]: { [id: string]: Player }}} = {};
const Threads: {[id: string]: {[id: string]: ThreadChannel}} = {};

export const commands: ApplicationCommandData[] = [
    {
        name: 'play',
        description: 'play a minigame',
        options: [
            {
                name: 'UNO',
                description: 'card game',
                type: ApplicationCommandOptionTypes.SUB_COMMAND
            }
        ]
    }
];
commands.push(...MusicCommands);

async function UpdateGuildCommands(id: string) {
    const rest = new REST({ version: '9' }).setToken(env.TOKEN!);
    try {
        await rest.put(Routes.applicationGuildCommands(env.clientID!, id), { body: commands })

    } catch (error) { console.log(error); }
}

Main();
function Main() {
    let { Player, Queue } = MusicPlayer();
    
    const client = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGES,
            Intents.FLAGS.GUILD_VOICE_STATES,
        ]
    });

    client.on('ready', async() => {
        if(client.user) {
            client.user.setActivity("Music", { type: "PLAYING" });
        }
        
        try {
            const guilds = await client.guilds.fetch();
            guilds.forEach(async guild => {
                await UpdateGuildCommands(guild.id);
            });

        } catch (error) {
            console.log(error);
        }
    });

    client.on('interactionCreate', async(interaction) => {
        if(!interaction.isCommand()) return;

        switch(interaction.commandName) {
            case "music":
                await interaction.deferReply();
                if(interaction.guild) {
                    switch(interaction.options.getSubcommand(true)) {
                        case "play":
                            const song = interaction.options.getString('song');
                            if(song) {
                                try {
                                    await Queue(song);
                                    const channel = await joinUserChannel(interaction.user.id, interaction.guild);
                                    if(channel) {
                                        channel.subscribe(Player);
        
                                        if(lastTrack) {
                                            if(Player.state.status === AudioPlayerStatus.Playing) {
                                                await interaction.deleteReply();
                                                return;
                                            }
                                            else {
                                                await interaction.editReply({ embeds: [PlayerEmbed(lastTrack.info)] });
                                                return;
                                            }
                                        }
                                        else {
                                            await interaction.editReply("⛔ ERROR : I didn't find any related data about the video, sorry. 😥");
                                            return;
                                        }
                                    }
                                    else {
                                        await interaction.editReply("You're not in a voice channel, dummy. 😐");
                                    }
                                } catch (error) {
                                    console.log(error);
                                }
                            }
                            else if(Player.state.status === AudioPlayerStatus.Paused) {
                                Player.unpause();
                            }
                        break;

                        case "pause":
                            Player.pause();
                        break;

                        case "skip":
                            Player.stop();
                            const stream = pop<Video>(streams);
                            if(stream) {
                                Player.play(await getLocalAudioStream(stream.url, join(__dirname, '../playback.mp3')));
                                await interaction.deleteReply();
                            }
                        break;

                        case "stop":
                            Player.stop();
                        break;

                        case "current":
                            if(lastTrack) {
                                await interaction.editReply({ embeds: [PlayerEmbed(lastTrack.info)] });
                                return;
                            }
                            else {
                                await interaction.reply("🔈| I'm not playing any song(s) right now you dummy. 😉");
                            }
                        break;
                    }
                }
            break;

            case "play":
                if(interaction.guild) {
                    if(interaction.channel) {
                        switch(interaction.options.getSubcommand(true)) {
                            case 'UNO':
                                await interaction.deferReply();
                                const thread = await createMessageThread(interaction.guild, interaction.channel.id, {
                                    name: 'UNO',
                                    autoArchiveDuration: 60,
                                    reason: "Bois be gamin'"
                                });

                                
                                thread.join();
                                commands.push({ name: 'ready', description: 'to get ready!' });
                                
                                if(GameSessions[interaction.guild.id][thread.id]) {
                                    delete GameSessions[interaction.guild.id][thread.id];
                                    delete Threads[interaction.guild.id][thread.id];
                                }
                                else {
                                    GameSessions[interaction.guild.id][thread.id] = {};
                                    Threads[interaction.guild.id][thread.id] = thread;
                                }

                                await interaction.deleteReply();
                            break;
                        }

                        return;
                    }
                    return;
                }
            break;

            case "ready":
                if(interaction.guild) {
                    if(interaction.channel && interaction.channel.isText() && interaction.channel.isThread()) {
                        await interaction.deferReply();
                        const player = GameSessions[interaction.guild.id][interaction.channel.id][interaction.user.id];
                        if(player && player.isReady) {
                            player.isReady = false;
                        }
                        else {
                            GameSessions[interaction.guild.id][interaction.channel.id][interaction.user.id] = { isReady: true, inventory: [], isTurn: true };
                        }

                        event.emit('playerSessionStatus', interaction.guild.id, interaction.channel.id);
                    }
                }
            break;

        }
    });

    client.on('threadDelete', (thread) => {
        if(thread.name === 'UNO') {
            delete GameSessions[thread.guild.id][thread.id];
        }
    });
}

event.on('playerSessionStatus', (GuildID: string, SessionID: string) => {
    let count = 0;
    Object.values(GameSessions[GuildID][SessionID]).forEach(member => {
        if(member.isReady) {
            count++;
        }
    });

    if(count > 1) {
        if(count === Object.keys(GameSessions[GuildID][SessionID]).length) {
            switch(Threads[GuildID][SessionID].name) {
                case "UNO":
                    UNO_Start(Object.values(GameSessions[GuildID][SessionID]));
                    commands.push(...uno_game_commands);
                break;
            }
        }
    }
});