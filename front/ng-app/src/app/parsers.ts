import { Message } from './json-objects';

export function parseMessage(data: Message): Message {
    data.timestamp = new Date(data.timestamp);
    return data;
}
