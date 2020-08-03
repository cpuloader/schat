import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Avatar, User, Room, Message } from './json-objects';
import { parseMessage } from './parsers';
import { ConfigService } from './config';
import { CryptoService } from './crypto.service';
import { CookieTools } from './cookie-tools.service';
import { AuthService } from './auth.service';
import { HeadersService } from './headers.service';

@Injectable()
export class UsersService {
    private chatUrl: string;
    private apiUrl: string;
    private users: User[] = [];
    private currentRoom: Room;                  // last opened chat room
    private messages: Message[] = [];           // all messages of opened chat
    private myUnreadMsgIds: number[] = [];      // ids of MY unread msgs in current chat
    private unreadMsgs: Message[] = [];         // unread msgs of another user in current chat

    constructor(private httpClient: HttpClient,
                private config: ConfigService,
                private authService: AuthService,
                private cryptoService: CryptoService,
                private cookieTools: CookieTools,
                private headers: HeadersService) {

        this.chatUrl = this.config.getChatUrl();
        this.apiUrl = this.config.getApiUrl();
    }

    // users to grid
    private _usersUpdated$: BehaviorSubject<User[]> = new BehaviorSubject([]);
    get usersUpdated$(): Observable<User[]> {
        return this._usersUpdated$.asObservable();
    }

    // messages for current chat room
    private _messagesUpdated$: BehaviorSubject<Message[]> = new BehaviorSubject([]);
    get messagesUpdated$(): Observable<Message[]> {
        return this._messagesUpdated$.asObservable();
    }

    // simple signal to rescroll chat window
    private _rescroll$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    get rescroll$(): Observable<boolean> {
        return this._rescroll$.asObservable();
    }

    // flags for home component
    private _flagsUpdate$: BehaviorSubject<string> = new BehaviorSubject(null);
    get flagsUpdate$(): Observable<string> {
        return this._flagsUpdate$.asObservable();
    }

    // signal to open room
    private _openRoom$: BehaviorSubject<User> = new BehaviorSubject(null);
    get openRoom$(): Observable<User> {
        return this._openRoom$.asObservable();
    }

    handleError(error: any): Observable<any> {
        let err = error || 'Error!';
        console.log(err.message || err);
        return throwError(err);
    }

    getUsers(email?: string): Observable<User[]> {
        let url: string;
        if (email) url = `${this.apiUrl}/accounts/?search=${email}`;
        else url = `${this.apiUrl}/accounts/`;
        return this.httpClient
            .get(url).pipe(
                catchError(this.handleError)
            );
    }

    updateUser(user: User): Observable<User> {
        const url = `${this.apiUrl}/accounts/${user.id}/`;
        let proxyUser = JSON.parse(JSON.stringify(user)); //make copy to not change view
        delete proxyUser.picture;                // we save picture in another way
        delete proxyUser.picture_mini;
        return this.httpClient
            .put(url, proxyUser, { headers: this.headers.makeCSRFHeader() }).pipe(
                catchError(this.handleError)
            );
    }

    // returns chatroom with logged user and another user
    getRoom(userId: number): Observable<Room> {
        const url = `${this.apiUrl}/rooms/${userId}/`;
        return this.httpClient
            .get<Room>(url).pipe(
                catchError(this.handleError)
            );
    }

    createRoom(room: Room): Observable<Room> {
        const url = `${this.apiUrl}/rooms/`;
        return this.httpClient
            .post<Room>(url, room, { headers: this.headers.makeCSRFHeader() }).pipe(
                catchError(this.handleError)
            );
    }

    // backend returns all rooms with client user in it
    getRooms(): Observable<Room[]> {
        const url = `${this.apiUrl}/rooms/`;
        return this.httpClient
            .get<Room[]>(url).pipe(
                catchError(this.handleError)
            );
    }

    deleteRoom(user: User): Observable<any> {
        const url = `${this.apiUrl}/rooms/0/?delete=${user.email}`;
        return this.httpClient
            .delete(url, { headers: this.headers.makeCSRFHeader() }).pipe(
                catchError(this.handleError)
            );
    }

    sendMessage(message: Message, roomLabel: string): Observable<Message> {
        const url = `${this.apiUrl}/messages/`
        let messageCopy = JSON.parse(JSON.stringify(message));
        messageCopy = this.cryptoService.encrypt(messageCopy, roomLabel); // make it secret!!!
        return this.httpClient
            .post<Message>(url, messageCopy, { headers: this.headers.makeCSRFHeader() }).pipe(
                map(res => parseMessage(res))
            ).pipe(
                catchError(this.handleError)
            );
    }

    updateMessage(message: Message): Observable<Message> {
        const url = `${this.apiUrl}/messages/${message.id}/`;
        let messageCopy = JSON.parse(JSON.stringify(message));
        delete messageCopy.message; // we don't want to send decrypted text
        return this.httpClient
            .put<Message>(url, messageCopy, { headers: this.headers.makeCSRFHeader() }).pipe(
                map(res => parseMessage(res))
            ).pipe(
                catchError(this.handleError)
            );
    }

    deleteMessage(message: Message): Observable<Object> {
        const url = `${this.apiUrl}/messages/${message.id}/`;
        return this.httpClient
            .delete(url, { observe: 'body',  headers: this.headers.makeCSRFHeader() }).pipe(
                catchError(this.handleError)
            );
    }

    getRoomMessages(roomId: number, time?: any, unread?: string, page?: number): Observable<Message[]> {
        let url: string;
        if (time && !unread) {
            url = `${this.apiUrl}/rooms/${roomId}/messages/?last_received=${time}`;
        } else if (time && unread) {
            url = `${this.apiUrl}/rooms/${roomId}/messages/?last_received=${time}&unread=${unread}`;
        } else if (page) {
            url = `${this.apiUrl}/rooms/${roomId}/messages/?page=${page}`;
        } else { url = `${this.apiUrl}/rooms/${roomId}/messages/`; }
        return this.httpClient
            .get<Message[]>(url).pipe(
                map(res => res['results'].reverse().map(parseMessage)) // results for pagination
            ).pipe(
                catchError(this.handleError)
            );
    }

    getMessages(unread?: boolean): Observable<Message[]> {
        let url: string;
        if (unread) {
            url = `${this.apiUrl}/messages/?unread=True`;
        } else { url = `${this.apiUrl}/messages/`; }
        return this.httpClient
            .get<Message[]>(url).pipe(
                catchError(this.handleError)
            );
    }

    updateAvatar(file: any): Observable<any> {
        const url = `${this.apiUrl}/avatars/`;
        let formData: FormData = new FormData();
        formData.append("picture", file, file.name);
        const req = new HttpRequest('POST', url, formData, {
            reportProgress: true, headers: this.headers.makeCSRFHeader()
        });
        return this.httpClient.request(req);
    }

    cleanAll(): void {
        this.users = [];
        this.messages = [];
        this.currentRoom = null;
        this.myUnreadMsgIds = [];
        this.unreadMsgs = [];
        this.resetSubjects();
    }

    resetSubjects() {
        this._usersUpdated$.next([]);
        this._messagesUpdated$.next([]);
        this._rescroll$.next(false);
        this._flagsUpdate$.next(null);
        this._openRoom$.next(null);
    }

    /*  methods for users in grid */

    // get all users to grid
    getAllUsers() {
        // load all our rooms and get users from them
        this.getRooms().subscribe(
            rooms => {
                let newUsers = [];
                for (let room of rooms) {
                    for (let member of room.members) {
                        if (member.id === this.authService.getLoggedUser().id) continue; // skip to next member
                        let index = newUsers.findIndex(function(u) { return member.id === u.id });
                        if (index == -1) newUsers.push(member);
                    }
                }
                this.users = newUsers;
                this._usersUpdated$.next(this.users);  // these users has no newMessages property yet
                this.getUnreadMessages();              // get unread msgs info for user indicators
                this._flagsUpdate$.next('homeloaded'); // send flag to component
            },
            error => {
                console.log(error);
            });
    }

    openRoomForUser(user: User) {
        const index = this.users.findIndex(function(u) { return u.id === user.id });
        if (index > -1) this.findAndMoveUserToBegin(user);
        else this.users.unshift(user);
        this._openRoom$.next(user); // send to component
        this._flagsUpdate$.next('opensidenav'); // signal to open side nav
    }

    /* getters and setters for messages */

    getCurrentRoom(): Room {
        return this.currentRoom;
    }

    setCurrentRoom(room: Room) {
        this.currentRoom = room;
    }

    getOrSetCurrentRoomMessages(messages?: Message[]): Message[] {
        if (!messages) return this.messages;
        this.messages = messages;
        this._messagesUpdated$.next(messages); // this is obs for reset msgs in component
    }

    getMyUnreadMessages(): number[] {
        return this.myUnreadMsgIds;
    }

    getUnreadMsgs(): Message[] {
        return this.unreadMsgs;
    }

    resetRoomMessages() {
        this.messages = [];
        this._messagesUpdated$.next([]);  // this is obs, resets msgs in component
        this.myUnreadMsgIds = [];
        this.unreadMsgs = [];
    }

    afterMessageDeleted(message: Message) {
        this.messages = this.messages.filter(msg => msg.id !== message.id);
        this.myUnreadMsgIds = this.myUnreadMsgIds.filter(id => id !== message.id);
    }

    /* methods for checking messages */

    // set messages as sent for indicator in msg card
    setMessagesAsSent(messages: Message[]) {
        for (let m of messages) {
            m.sent = true;
            this.messages.push(m);
            if (m.author.username !== this.authService.getLoggedUser().username && !m.checked) {
                this.unreadMsgs.push(m);
            }
        }
        this._messagesUpdated$.next(messages); // send to component
    }

    // add new msg to chat window, send it and update my unread msgs
    addMessage(newMessage: Message) {
        this.messages.push(newMessage);
        this._messagesUpdated$.next(this.messages);  // send to component
        this.sendMessage(newMessage, this.currentRoom.label)
             .subscribe(
                 msg => {
                     // find message by created time and author because they have no id yet
                     let index = this.messages.findIndex(
                                function(elem) { return (elem.timestamp.getTime() === msg.timestamp.getTime()) &&
                                (elem.author.username === msg.author.username) });
                     if (index > -1) {
                         this.messages[index].sent = true;
                         this.messages[index].id = msg.id;
                         this._messagesUpdated$.next(this.messages);  // send to component
                         this.myUnreadMsgIds.push(msg.id);       // add to list of MY unread msgs ids
                     }
                 },
                 error => { console.log(error); }
                 );
    }

    // remove read message from user.newMessages (for indicators)
    updateUsersNewMessages(msg: Message) {
        const userIndex = this.users.findIndex(function(u) { return (msg.author.id === u.id); });
        if (userIndex === -1 || !this.users[userIndex]['newMessages']) return;
        const index = this.users[userIndex].newMessages.findIndex(    // find message by id
                 function(elem) { return (elem.id === msg.id); });
        if (index > -1) {
            this.users[userIndex].newMessages.splice(index, 1);
            this._usersUpdated$.next(this.users);   // these users now have newMessages property
        }
    }

    // get unread messages from server and collect them
    getUnreadMessages() {
        this.getMessages(true).subscribe(
            messages => {
                if (messages) {
                    for (let msg of messages) {
                        this.collectUsersNewMessages(msg, false);
                    }
                }
            },
            error => {
                console.log(error);
            });
    }

    // collect messages and add them to newMessages property of each user, for indicators in grid
    // also add new user to grid if he is not there yet
    collectUsersNewMessages(msg: Message, shiftUsers: boolean) {
        let hasMsg = false;
        let fromUserNotInGrid = true;
        for (let user of this.users) {
            if (msg.author.id === user.id) {
                fromUserNotInGrid = false;
                if (!user['newMessages']) {
                    user.newMessages = [msg];
                    if (shiftUsers) this.findAndMoveUserToBegin(user);
                } else {
                    const index = user.newMessages.findIndex(    // find message by id
                        function(elem) { return (elem.id === msg.id); });
                    if (index === -1) {
                        // this is new message, add to array
                        user.newMessages.push(msg);
                        if (shiftUsers) this.findAndMoveUserToBegin(user);
                    }
                }
                hasMsg = true; // at least one msg added
                break;
            }
        }
        if (fromUserNotInGrid) {
            msg.author.newMessages = [msg];
            this.users.unshift(msg.author); // add first
            hasMsg = true;
        }
        if (hasMsg) this._usersUpdated$.next(this.users); // update users in component
    }

    // find and move user to first place in grid
    findAndMoveUserToBegin(user: User) {
        if (user.id === this.authService.getLoggedUser().id) return;
        const index = this.users.findIndex(
            function(elem) { return (elem.id === user.id); });
        if (index > -1) {
            this.users.splice(index,1);  // cut out user from array
            this.users.unshift(user);   // move user to beginning
        }
    }

    // check unread msgs and send them to server as read
    checkUnreadMsgs() {
        if (!this.unreadMsgs.length) return;
        for (let msg of this.unreadMsgs) {
            if (this.currentRoom && msg.room === this.currentRoom.id) {  // do it only for msg in opened chat
                msg.checked = true;                    // set received msgs as read

                // remove checked message from user.newMessages (for indicators)
                this.updateUsersNewMessages(msg);

                // send msg to update as read
                this.updateMessage(msg).subscribe(
                    m => {
                        const index = this.unreadMsgs.findIndex(    // find message by id
                                 function(elem) { return (elem.id === msg.id); });
                        if (index > -1) this.unreadMsgs.splice(index, 1);
                    },
                    err => console.log(err));
            }
        }
    }

    incomingMessageCheck(msg: Message) {
        // collecting not my messages and adding them to newMessages property of each user, for indicators in grid
        if (msg.author.id !== this.authService.getLoggedUser().id) {
            this.collectUsersNewMessages(msg, true);
        }

        // we receiving messages from all rooms here so must filter, here we need only current room's msgs
        if (this.currentRoom && msg.room == this.currentRoom.id) {
            let msgIsNew = true;
            for (let message of this.messages) { // checking if this msg is new and not in this.messages
                if (msg.id === message.id) {
                  msgIsNew = false;
                }
            }
            // if it is my message and is already in this.messages - check it as read and remove from my unread msgs
            if (!msgIsNew && msg.author.username === this.authService.getLoggedUser().username && msg.checked) {
                const index = this.messages.findIndex(    // find message by id
                        function(elem) { return (elem.id === msg.id); });
                if (index > -1) {
                    this.messages[index].checked = msg.checked;
                    this._messagesUpdated$.next(this.messages);   // send to component
                    this.myUnreadMsgIds.splice(this.myUnreadMsgIds.indexOf(msg.id), 1);
                }
            }
            // if msg is new, not my and not read, add it to unread msgs
            if (msgIsNew && msg.author.username !== this.authService.getLoggedUser().username && !msg.checked) {
                msg = this.cryptoService.decryptMessage(msg, this.currentRoom.label);    // decrypt!
                this.messages.push(msg);
                this._messagesUpdated$.next(this.messages);   // send to chat window component
                this.unreadMsgs.push(msg);
                this._rescroll$.next(true); // signal to rescroll chat window component
            }
        }
    }

    cleanAfterRoomDelete(userId: Number, result: any) {
        let label = (result.lenth) ? result[0].label : null;
        this.currentRoom = null;
        this.cryptoService.deleteKey(label);
        const index = this.users.findIndex(function(u) { return (u.id === userId); });
        if (index > -1) {
            this.users.splice(index, 1);
            this._usersUpdated$.next(this.users);
        }
        // TODO: here should clean all msgs from deleted chat
        // ...
    }
}
