export function generateDeck(suits: Array<any>, values: Array<any>): Array<Object> {
    let arr: Array<Object> = [];
    for(let i = 0; i < suits.length; i++) {
        for(let j = 0; j < values.length; j++) {
            arr.push({ suit: suits[i], value: values[j] });
        }
    }

    return arr;
}

export function DistributeDeck<T>(players: number, deck: Array<T>) {
    let distroCount = deck.length / players;
    let playerDecks: Array<Array<T>> = [];

    let pivot = 0;
    for(let i = 0; i < players; i++) {
        playerDecks.push([]);
        for(let j = 0; j < distroCount; j++) {
            if(pivot < distroCount) {
                playerDecks[i][j] = deck[pivot];
            }
            else {
                playerDecks[i][j] = deck[pivot];
            }

            delete deck[pivot];
            pivot++;
        }
    }
}