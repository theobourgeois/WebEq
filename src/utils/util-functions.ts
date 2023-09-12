import {idGen} from "./globals";

export function* idGenerator() {
    let id = 0;
    while (true) {
        yield ++id;
    }
}

export const getNewID = () => idGen.next().value as number;


