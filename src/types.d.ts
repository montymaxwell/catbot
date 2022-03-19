export declare interface Video { url: string, info: VideoMetadata }

export declare interface Member {
    type: "Player" | "Bot", 
    isReady: boolean, 
    inventory?: any,
    isTurn?: boolean
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
