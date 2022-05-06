import dotenv from 'dotenv';
import { join } from 'path';

import EventEmitter from 'events';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { AudioPlayerStatus } from '@discordjs/voice';
import { ApplicationCommandData, Client, Intents, ThreadChannel } from 'discord.js';

import { pop } from './utils/Array';
import { joinUserChannel } from './components/VoiceClient';
import { Card, Event, Player, UNOCard, Video } from './types';
import { createMessageThread } from './components/MessageThread';
import { getLocalAudioStream } from './components/AudioHandlers';
import { ApplicationCommandOptionTypes } from 'discord.js/typings/enums';
import { uno_game_commands, UNO_Start } from './systems/minigames/UNO';
import { lastTrack, MusicPlayer, PlayerEmbed, MusicCommands, streams } from './cmd/music';
import yts, { VideoSearchResult } from 'yt-search';
import { MusicOptionsField } from './components/Embeds';

dotenv.config({ path: join(__dirname, './.env') });
const env = process.env;

export const event: Event = new EventEmitter();
const Threads: {[id: string]: {[id: string]: ThreadChannel}} = {};
const GameSessions: { [guildID: string]: { [ChannelID: string]: { [PlayerID: string]: Player } } } = {};

export const commands: ApplicationCommandData[] = [
    {
        name: 'playgames',
        description: 'play a minigame',
        options: [
            {
                name: 'uno',
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

const UNOStats: { lastCard: UNOCard | null, isRotationFlipped: boolean, deck: UNOCard[] | any[] } = { lastCard: null, isRotationFlipped: false, deck: [] };

Main();
function Main() {
    let videos: VideoSearchResult[];
    const { Player, Queue } = MusicPlayer();
    
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
                                    if(song.startsWith('https://www.youtube.com/watch?v=')) {
                                        await Queue(song);
                                    }
                                    // to not crash my script
                                    else if(song === "1" || song === "2" || song === "3" || song === "4" || song === "5") {
                                        if(Number(song) > 0) {
                                            await Queue(videos[(Number(song) - 1)].url);
                                        }
                                    }
                                    else {
                                        const result = await yts(song);
                                        videos = result.videos.splice(0, 5);
                                        await interaction.editReply({ embeds: [MusicOptionsField(videos)] });
                                        return;
                                    }

                                    const channel = await joinUserChannel(interaction.user.id, interaction.guild);
                                    if(channel) {
                                        channel.subscribe(Player);
        
                                        if(lastTrack) {
                                            if(Player.state.status == AudioPlayerStatus.Playing) {
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
                            else if(Player.state.status == AudioPlayerStatus.Paused) {
                                Player.unpause();
                                await interaction.deleteReply();
                            }
                        break;

                        case "pause":
                            Player.pause();
                            await interaction.deleteReply();
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
                            await interaction.deleteReply();
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

            case "playgames":
                if(interaction.guild) {
                    if(interaction.channel) {
                        switch(interaction.options.getSubcommand(true)) {
                            case 'uno':
                                await interaction.deferReply();
                                const thread = await createMessageThread(interaction.guild, interaction.channel.id, {
                                    name: 'UNO',
                                    autoArchiveDuration: 60,
                                    reason: "Bois be gamin'"
                                });
                                
                                thread.join();
                                commands.push({ name: 'ready', description: 'to get ready!' });
                                GameSessions[interaction.guild.id] = {[thread.id]: {}};
                                Threads[interaction.guild.id] = {[thread.id]: thread};
                                await UpdateGuildCommands(interaction.guild.id);
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
                            await interaction.editReply(`${interaction.user.username} is not ready.`)
                        }
                        else {
                            GameSessions[interaction.guild.id][interaction.channel.id][interaction.user.id] = { isReady: true, inventory: [], isTurn: true };
                            await interaction.editReply(`${interaction.user.username} is ready!`);
                        }

                        event.emit('playerSessionStatus', interaction.guild.id, interaction.channel.id);
                    }
                }
            break;

            case "deck":
                if(interaction.guild) {
                    if(interaction.channel && interaction.channel.isText() && interaction.channel.isThread()) {
                        await interaction.deferReply({ ephemeral: true });
                        const player = GameSessions[interaction.guild.id][interaction.channel.id][interaction.user.id];
                        const currentDeck: string[] = [];
                        if(player.inventory) {
                            const deck: Card[] = player.inventory;
                            deck.forEach(card => {
                                currentDeck.push(`[${deck.indexOf(card)}] = | ${card.suit} - ${card.value} |`);
                            });

                            await interaction.editReply(currentDeck.toString());
                            return;
                        }

                        return;
                    }
                    return;
                }
            break;

            case "drop":
                if(interaction.guild) {
                    if(interaction.channel && interaction.channel.isText() && interaction.channel.isThread()) {
                        if(GameSessions[interaction.guild.id][interaction.channel.id][interaction.user.id].isTurn == true) {
                            await interaction.deferReply();
                            const index = interaction.options.getNumber('card')!;
                            const player = GameSessions[interaction.guild.id][interaction.channel.id][interaction.user.id];
                            const inventory: UNOCard[] = player.inventory;
                            const card = inventory[index];

                            const stats: any[] = [];
                            
                            if(UNOStats.lastCard !== null) {
                                if(card.suit == UNOStats.lastCard.suit) {
                                    UNOStats.lastCard = card;
                                }
                                else if(card.value == UNOStats.lastCard.value) {
                                    UNOStats.lastCard = card;
                                }
                                else if(card.effect) {
                                    stats.push(card.effect);
                                }
                            }
                            else {
                                UNOStats.lastCard = card;
                            }
                            
                            stats.push(...[interaction.guild.id, interaction.channel.id, player]);
                            
                            player.isTurn = false;
                            event.emit('playerMoved', ...stats);
                            await interaction.editReply(`${interaction.user.username} has dropped ${UNOStats.lastCard}`);
                            delete inventory[index];
                            return;
                        }
                        else {
                            await interaction.reply({ ephemeral: true, nonce: "it's not your turn yet." });
                            return;
                        }
                    }
                    return;
                }
            break;

        }
    });

    client.on('threadDelete', (thread) => {
        if(thread.name == 'UNO') {
            delete GameSessions[thread.guild.id][thread.id];
        }
    });

    client.login(env.TOKEN!);
}

event.on('playerSessionStatus', async(GuildID: string, SessionID: string) => {
    let count = 0;
    Object.values(GameSessions[GuildID][SessionID]).forEach(member => {
        if(member.isReady) {
            count++;
        }
    });

    if(count > 1) {
        if(count == Object.keys(GameSessions[GuildID][SessionID]).length) {
            console.log('hewwo?')
            switch(Threads[GuildID][SessionID].name) {
                case "UNO":
                    console.log('uno')
                    UNOStats.deck = UNO_Start(Object.values(GameSessions[GuildID][SessionID]));
                    commands.push(...uno_game_commands);
                    await UpdateGuildCommands(GuildID);
                break;
            }
        }
    }
});

event.on('playerMoved', (guild: string, channel: string, id: string, effect?: string) => {
    const players = Object.keys(GameSessions[guild][channel]);
    let index = players.indexOf(id);

    if(effect) {
        switch(effect) {
            case "Draw 2 Card":
                for(let i = 0; i < 2; i++) {
                    Object.values(GameSessions[guild][channel])[index].inventory.push(UNOStats.deck[i]);
                }
            break;

            case "Reverse Card":
                UNOStats.isRotationFlipped = true;
            break;

            case "Skip Card":
                if(UNOStats.isRotationFlipped == true) {
                    index -= 1;
                }
                else {
                    index += 1;
                }
            break;

            case "Wild Card":
                
            break;

            case "Wild Draw 4 Card":
                for(let i = 0; i < 4; i++) {
                    Object.values(GameSessions[guild][channel])[index].inventory.push(UNOStats.deck[i]);
                }
            break;

        }
    }

    if(index == (players.length - 1)) {
        console.log('if')
        index = 0;
    }
    else if(index < 0) {
        console.log('else if')
        index = (players.length - 1);
    }
    else {
        console.log('else')
        if(UNOStats.isRotationFlipped == true) {
            index -= 1;
        }
        else {
            index += 1;
        }
    }

    Object.values(GameSessions[guild][channel])[index].isTurn = true;
});