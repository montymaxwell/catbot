import { EventEmitter } from "events";
import { ApplicationCommandData, Guild } from "discord.js";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";

import { Member, Player } from "../../types";
import { Shuffle } from "../../utils/Array";
import { generateDeck } from "../../game-frameworks/card-games/Deck";
import { createMessageThread } from "../../components/MessageThread";

export const uno_game_commands: ApplicationCommandData[] = [
    {
        name: 'deck',
        description: 'shows your deck',
    },
    {
        name: 'drop', 
        description: 'drops a card of your choice',
        options: [
            {
                name: 'card',
                required: true,
                type: ApplicationCommandOptionTypes.NUMBER,
                description: 'index of card that you are picking to drop from deck',
            },
        ]
    }
]


export function UNO_Start(Members:  Player[]) {
    let suits = ["red", "green", "blue", "yellow"];
    let values = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9];
    const deck = Shuffle(generateDeck(suits, values));

    let i = 0;
    let base = [];
    for(let j = 0; j < Object.entries(Members).length; j++) {
        for(let k = 0; k < deck.length; k++) {
            if(i < 7) {
                base.push(deck[i]);
            }

            delete deck[i];
            i+=1;
        }

        i = 0;
        Members[j].inventory = base;
    }

    return deck;
}

// should i do object oriented approach?... idk yet.
export class UNO extends EventEmitter {
    public SessionID: string = "";
    public channelID: string;
    private guild: Guild;

    constructor(guild: Guild, ChannelID: string) {
        super();
        this.guild = guild;
        this.channelID = ChannelID;
    }

    public async CreateSession() {
        const thread = await createMessageThread(this.guild, this.channelID, {
            name: 'UNO',
            autoArchiveDuration: 60,
            reason: 'bois be gamin'
        });
 
        this.SessionID = thread.id;
    }

    Deck(Members: Member[]) {
        let suits = ["red", "green", "blue", "yellow"];
        let values = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9];
        const deck = Shuffle(generateDeck(suits, values));
    
        let i = 0;
        let base = [];
        for(let j = 0; j < Object.entries(Members).length; j++) {
            for(let k = 0; k < deck.length; k++) {
                if(i < 7) {
                    base.push(deck[i]);
                }
    
                delete deck[i];
                i+=1;
            }
    
            i = 0;
            Members[j].inventory = base;
        }
    }

    LobbyCommands(): ApplicationCommandData[] {
        return [
            {
                name: 'ready',
                description: 'to get ready!'
            }
        ]
    }

    GameCommands(): ApplicationCommandData[] {
        return [
            {
                name: 'deck',
                description: 'shows your deck',
            },
            {
                name: 'drop', 
                description: 'drops a card of your choice',
                options: [
                    {
                        name: 'card',
                        required: true,
                        type: ApplicationCommandOptionTypes.STRING,
                        description: 'card that you are picking to drop',
                    },
                ]
            }
        ]
    }

    toObject() {
        return {
            SessionID: this.SessionID,
            ChannelID: this.channelID,
            guild: this.guild
        }
    }
}