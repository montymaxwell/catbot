export declare interface Video { url: string, info: VideoMetadata }

export declare interface Member {
    type: "Player" | "Bot", 
    isReady: boolean, 
    inventory?: any,
    isTurn?: boolean
}

export declare interface Card {
    suit: string,
    value: number,
}

export declare interface UNOCard extends Card {
    effect?: string
}

export declare interface Player {
    isReady: boolean,
    isTurn?: boolean,
    inventory?: any
}

export declare interface VideoMetadata {
    title: string,
    url: string,
    views: number,
    timestamp: string,
    uploadDate: string,
    image: string,
}

type EventTypes = "playerSessionStatus" | "playerMoved";

export interface Event {
    emit: (event: EventTypes, ...args: any[]) => {}
    on: (event: EventTypes, listener: (...args: any[]) => void) => {}
}