
/**
 * removes the first item from an array, and returns that removed item.
 */
export function pop<T>(arr: Array<T>) {
    const item = arr.splice(0, 1);
    return item[0];
};

/**
 * @param array 
 * @returns Array
 */
export function Shuffle<T>(array: Array<T>): Array<T> {
    for(let i = array.length -  1; i > 0; i--) {
        let pivot = Math.floor(Math.random() * (i + 1));
        let Item = array[pivot];

        array[pivot] = array[i];
        array[i] = Item;
    }

    return array;
}