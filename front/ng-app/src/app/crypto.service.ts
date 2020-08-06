import { Injectable } from '@angular/core';
import { AES, SHA256, enc } from 'crypto-js';
import { User, Message } from './json-objects';
import { WindowRef } from './window';

@Injectable()
export class CryptoService {
    private roomKeys: any = {};

    constructor(private windowRef: WindowRef) {}

    encrypt(message: Message, roomLabel: string): Message {
        let key = this.getKey(roomLabel);
        if (!key) {
            //console.log('no key, send as is', message.message);
            return message;
        } else {
            let ciphertext = AES.encrypt(message.message, key);
            message.message = ciphertext.toString();
            message.encrypted = true;
            //console.log('encrypted', message.message);
            return message;
        }
    }

    decrypt(message: Message, key?: string): Message {
        //console.log('from db', message.message);
        let clearText: any;
        if (!message.encrypted) return message;
        else if (message.encrypted && !key) {
            message.notdecoded = true;
            return message;
        }
        try {
            clearText = AES.decrypt(message.message,  key);
            clearText = clearText.toString(enc.Utf8);
            //console.log('decrypted', clearText);
        } catch (err) {
            //console.log('not decrypted, error');
            message.notdecoded = true;
            return message;
        }
        if (!clearText) {
            message.notdecoded = true;
            return message;
        }
        message.message = clearText;
        return message;
    }

    getKey(roomLabel: string): string {
        //console.log('keys[roomLabel]', this.roomKeys[roomLabel]);
        return this.roomKeys[roomLabel];
    }

    setKey(password: string, roomLabel: string) {
        //console.log('all keys', this.roomKeys);
        const hashedPassword = SHA256(password);
        let plainText = hashedPassword.toString();
        this.roomKeys[roomLabel] = this.windowRef.nativeWindow.escape(plainText);
        //console.log('set password', password, 'for room', roomLabel, 'hashed', this.roomKeys[roomLabel]);
    }

    deleteKey(roomLabel: string): void {
        delete this.roomKeys[roomLabel];
    }

    deleteAllKeys(): void {
        this.roomKeys = {};
    }

    // storage is bad for keys
    getKeyFromStorage(roomLabel: string): string {
        let keys = localStorage.getItem('secretKeys');
        if (!keys) return null;
        else keys = JSON.parse(keys);
        return keys[roomLabel];
    }

    setKeyToStorage(password: string, roomLabel: string) {
        let keys = localStorage.getItem('secretKeys');
        if (!keys) keys = "{}";
        keys = JSON.parse(keys);
        const hashedPassword = SHA256(password);
        let plainText = hashedPassword.toString();
        keys[roomLabel] = this.windowRef.nativeWindow.escape(plainText);
        localStorage.setItem('secretKeys', JSON.stringify(keys));
    }

    deleteKeyInStorage(roomLabel: string): void {
        let keys = localStorage.getItem('secretKeys');
        if (!keys) return null;
        else keys = JSON.parse(keys);
        delete keys[roomLabel];
        localStorage.setItem('secretKeys', JSON.stringify(keys));
    }

    decryptMessage(message: Message, roomLabel: string): Message {
        let key = this.getKey(roomLabel);
        if (!key) return message;
        return this.decrypt(message, key);
    }

    decryptMessages(messages: Message[], roomLabel: string): Message[] {
       let key = this.getKey(roomLabel);
       let newMessages = [];
       for (let msg of messages) {
           newMessages.push(this.decrypt(msg, key));
       }
       return newMessages;
    }
}
