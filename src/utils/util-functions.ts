import { EQUALIZER_DIMENSIONS } from "./constants";
import { idGen } from "./globals";

export function* idGenerator() {
    let id = 0;
    while (true) {
        yield ++id;
    }
}
export const getNewID = () => idGen.next().value as number;

export const frequencyToX = (frequency: number) => {
    return (frequency / 20000) * EQUALIZER_DIMENSIONS.width;
}

