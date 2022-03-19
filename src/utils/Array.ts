
/**
 * just a method that inverses Array.pop() functionality
 */
export function pop<T>(arr: Array<T>) {
    arr.reverse();
    const item = arr.pop();
    arr.reverse();
    return item;
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