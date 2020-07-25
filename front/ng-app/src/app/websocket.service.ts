import { Injectable } from '@angular/core';
import { Observer, Observable, Subject, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { User, Room, Message } from './json-objects';
import { ConfigService } from './config';
import { WindowRef } from './window';
import { parseMessage } from './parsers';
import { CookieTools } from './cookie-tools.service';

@Injectable()
export class WebSocketService {
    private subject: Subject<MessageEvent>;
    private ws: WebSocket;
    private checkLoop: any;
    private url: string;
    private roomName: number;
    private chatUrl: string;
    private shouldReconnect: boolean = true;
    private reconnectAttempts: number = 0;

    constructor(private windowRef: WindowRef,
                private config: ConfigService,
                private cookieTools: CookieTools) {
        this.chatUrl = this.config.getChatUrl();
    }

    public messages: Subject<Message>  = new Subject<Message>();

    private _socketState$: BehaviorSubject<string> = new BehaviorSubject(null);
    get socketState$(): Observable<string> {
        return this._socketState$.asObservable();
    }

    openRoom(roomName: number) {
        this.url = `${this.chatUrl}/${roomName}`;
        this.roomName = roomName;
        //console.log('opening room', this.roomName);
        this.messages = null;
        this.messages = <Subject<Message>>this.connect(this.url).pipe(
                map((response: MessageEvent): Message => {
                    //console.log(JSON.parse(response.data));
                    return parseMessage(JSON.parse(response.data));
                })
            );
    }

    closeRoom(reallyClose: boolean) {
        if (this.ws && reallyClose) {
            this.shouldReconnect = false;
            console.log('closing socket');
            clearInterval(this.checkLoop);
            this.ws.close();
        }
    }

    private connect(url: string): Subject<MessageEvent> {
        this.url = url;
        if (this.ws) {
            this.ws.close();
        }
        const token = localStorage.getItem('id_token');
        if (!token) {
            this.shouldReconnect = false;
            return;
        }
        this.cookieTools.setAuthorization(token);
        this.subject = this.create(this.url, token);
        //if (this.checkLoop) clearInterval(this.checkLoop);
        //this.startCheckLoop();
        return this.subject;
    }

    private create(url: string, token: string): Subject<MessageEvent> {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
            console.log('socket ok');
            this._socketState$.next('connect');  // signal to subscribe in component
            this.reconnectAttempts = 0;
        };
        this.ws.onerror   = () => {
            console.log('error: ws status', this.ws.readyState);
            setTimeout(() => this.check(), 5000);
        };
        let observable = Observable.create(
            (obs: Observer<MessageEvent>) => {
                this.ws.onmessage = obs.next.bind(obs);
                //this.ws.onerror   = obs.error.bind(obs);
                this.ws.onclose   = () => {
                    obs.complete.bind(obs);
                    console.log('ws close', this.ws.readyState);
                    //setTimeout(() => this.check(), 5000);
                }
                return; //this.close(true);
        });
        let observer = {
            next: (data: Object) => {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify(data));
                }
            }
        };
        return Subject.create(observer, observable);
    }

    private check() {
        if (this.ws) console.log('ws readyState', this.ws.readyState);
        if (!this.ws || this.ws.readyState == 3 && this.url && this.shouldReconnect) {
            this._socketState$.next('disconnect');  // signal to unsubscribe in component
            this.openRoom(this.roomName);
        }
    }

    private startCheckLoop() {
        this.checkLoop = setInterval(() => this.check(), 5000);
    }

    // not used yet
    private getBackoffDelay(attempt) {
        let R = Math.random() + 1;
        let T = 500;     // initial timeout
        let F = 2;
        let N = attempt;
        let M = 300000;  // max timeout
        return Math.floor(Math.min(R * T * Math.pow(F, N), M));
    }
}
