import { Injectable } from '@angular/core';
import { Observer, Observable, Subject, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { User, Room, Message } from './json-objects';
import { ConfigService } from './config';
import { WindowRef } from './window';
import { parseMessage } from './parsers';
import { CookieTools } from './cookie-tools.service';
import { AuthService } from './auth.service';

@Injectable()
export class WebSocketService {
    private subject: Subject<MessageEvent>;
    private ws: WebSocket;
    private checkLoop: any;
    private url: string;
    private userId: number;
    private chatUrl: string;
    private shouldReconnect: boolean = true;
    private reconnectAttempts: number = 0;

    constructor(private windowRef: WindowRef,
                private config: ConfigService,
                private authService: AuthService,
                private cookieTools: CookieTools) {
        this.chatUrl = this.config.getChatUrl();
    }

    public messages: Subject<Message>  = new Subject<Message>();

    private _socketState$: BehaviorSubject<string> = new BehaviorSubject(null);
    get socketState$(): Observable<string> {
        return this._socketState$.asObservable();
    }

    openWS(userId: number) {
        this.url = `${this.chatUrl}/${userId}`;
        this.userId = userId;
        this.messages = null;
        this.messages = <Subject<Message>>this.connect(this.url).pipe(
                map((response: MessageEvent): Message => {
                    console.log('incoming msg', response.data);
                    return parseMessage(JSON.parse(response.data));
                })
            );
    }

    closeWS(reallyClose: boolean) {
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
        if (!this.authService.authenticated()) {
            this.shouldReconnect = false;
            return;
        }
        this.subject = this.create(this.url);
        return this.subject;
    }

    private create(url: string): Subject<MessageEvent> {
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
            console.log('socket ok');
            this._socketState$.next('connect');  // signal to subscribe in component
            this.reconnectAttempts = 0;
        };
        this.ws.onerror   = (err) => {
            console.log('error: ws status', this.ws.readyState, err);
            setTimeout(() => this.check(), this.getBackoffDelay(this.reconnectAttempts));
        };
        let observable = Observable.create(
            (obs: Observer<MessageEvent>) => {
                this.ws.onmessage = obs.next.bind(obs);
                //this.ws.onerror   = obs.error.bind(obs);
                this.ws.onclose   = () => {
                    obs.complete.bind(obs);
                    console.log('ws close', this.ws.readyState);
                }
                return;
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
        //if (this.ws) console.log('ws readyState', this.ws.readyState);
        if (!this.ws || this.ws.readyState == 3 && this.url && this.shouldReconnect) {
            this._socketState$.next('disconnect');  // signal to unsubscribe in component
            this.reconnectAttempts++;
            this.openWS(this.userId);
        }
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
