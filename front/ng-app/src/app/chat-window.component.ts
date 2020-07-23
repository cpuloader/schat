import { Component, Input, SimpleChanges, ViewContainerRef } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material';
import { Subscription } from 'rxjs';
import { User, Room, Message } from './json-objects';
import { UsersService } from './users.service';
import { ConfigService } from './config';
import { CryptoService } from './crypto.service';
import { RoomKeyDialogComponent } from './room-key-dialog.component';
import { DialogConfirmComponent } from './dialog-confirm.component';

@Component({
    selector: 'chat-window',
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent {
    @Input() loggedUser: User;
    @Input() selectedUser: User;
    @Input() tabChanged: boolean;
    @Input() newRoomKeySet: boolean;

    defaultProfilePic_mini:string;
    pageSize: number;
    hasOlderMessages: boolean; //flag
    chatLoaded: boolean;  //flag
    redrawWindow: boolean = false;
    messages: Message[] = [];           // all messages of opened chat
    dialog: MatDialogRef<any>;

    private roomOpened: Subscription;
    private roomMessagesGetter: Subscription;
    private roomMessagesForPageGetter: Subscription;
    private roomCreator: Subscription;
    private messagesSubscription: Subscription;
    private refreshWindowSubscription: Subscription;

    constructor(private config: ConfigService,
                private usersService: UsersService,
                private cryptoService: CryptoService,
                private vcr: ViewContainerRef,
                private mdDialog: MatDialog) {

        this.defaultProfilePic_mini = this.config.defaultProfilePicture_mini;
        this.pageSize = this.config.pageSize;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['selectedUser'] && changes['selectedUser'].currentValue) {
            this.openRoom(changes['selectedUser'].currentValue);
        }
        if (changes['newRoomKeySet'] && changes['newRoomKeySet'].currentValue) {
            const currentRoom = this.usersService.getCurrentRoom();
            if (!currentRoom) return;
            this.openRoomKeyDialog(currentRoom.label);
        }
        if (changes['tabChanged']) {
            this.refreshChatWindow(1);
        }
    }

    refreshChatWindow(time) {
        setTimeout(() => this.redrawWindow = !this.redrawWindow, time);
    }

    openRoom(user: User) {
        if (!user) return;
        if (this.roomOpened) this.roomOpened.unsubscribe(); // reset subscription
        this.hasOlderMessages = false;                   // to reset page count
        this.roomOpened = this.usersService.getRoom(user.id).subscribe(
            room => {
                if (room['id']) {
                    if (room.messages.length > this.pageSize) this.hasOlderMessages = true; // check if has pages
                    this.refreshChatWindow(1);
                    // if this is not last opened room, reset all messages and room - and get new
                    const currentRoom = this.usersService.getCurrentRoom();
                    if (!currentRoom || currentRoom.id != room.id) {
                        this.usersService.setCurrentRoom(room);
                        this.chatLoaded = false;
                        if (!this.cryptoService.getKey(room.label)) {
                            this.openRoomKeyDialog(room.label, null);
                            return;
                        }
                        this.getRoomMessages(room.id);
                    }
                } else { // room does not exist yet
                    this.chatLoaded = true;
                    this.usersService.setCurrentRoom(null);
                    this.usersService.resetRoomMessages();
                }
            }
        );
    }

    openRoomKeyDialog(label: string, message?: Message) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.viewContainerRef = this.vcr;
        this.dialog = this.mdDialog.open(RoomKeyDialogComponent, dialogConfig);
        this.dialog.componentInstance.label = label;
        this.dialog.afterClosed().subscribe(result => {
            if (message) {
                this.addMessage(message);  // for new room
            } else {
                const currentRoom = this.usersService.getCurrentRoom();
                this.getRoomMessages(currentRoom.id);  // reload all messages for existing room
            }
            this.dialog = null;
        });
    }

    onRoomKeySet(event: boolean) {
        this.openRoomKeyDialog(this.usersService.getCurrentRoom().label);
    }

    getRoomMessages(roomId) {
        this.usersService.resetRoomMessages();
        this.chatLoaded = false;
        this.roomMessagesGetter = this.usersService.getRoomMessages(roomId).subscribe(
            (messages: Message[]) => {
                const currentRoom = this.usersService.getCurrentRoom();
                messages = this.cryptoService.decryptMessages(messages, currentRoom.label);         // decrypt!
                this.chatLoaded = true;
                this.usersService.setMessagesAsSent(messages);
                this.refreshChatWindow(50);
            },
            error => { console.log(error); }
        );
    }

    // for button "Load older.."
    loadMoreMessages() {
        const messages = this.usersService.getOrSetCurrentRoomMessages();
        const currentRoom = this.usersService.getCurrentRoom();
        let page: number = Math.floor(messages.length / this.pageSize);
        let added: number;
        if (page) added = messages.length - this.pageSize * page;
        else added = messages.length - this.pageSize;
        this.chatLoaded = false;
        this.roomMessagesForPageGetter = this.usersService.getRoomMessages(currentRoom.id, null, null, page + 1)
            .subscribe(nextMsgs => {
                this.messages.splice(0, 0, ...nextMsgs.slice(0, nextMsgs.length - added));
                if (currentRoom.messages.length <= messages.length) this.hasOlderMessages = false;
                this.chatLoaded = true;
            },
            err => {
                console.log(err);
                this.chatLoaded = true;
            }
        );
    }

    // new message entered by logged user
    onMessageAdd(newMessage: Message) {
        const currentRoom = this.usersService.getCurrentRoom();
        if (currentRoom) {
            newMessage.room = currentRoom.id; // important
            this.addMessage(newMessage);
        } else { // this is first message for not created room
            let newRoom = new Room();
            newRoom.members = [this.loggedUser, this.selectedUser];
            this.roomCreator = this.usersService.createRoom(newRoom).subscribe(
                room => {
                    this.usersService.setCurrentRoom(room);
                    newMessage.room = room.id; // important
                    this.openRoomKeyDialog(room.label, newMessage); // open dialog to set room key, we will send message after close
                });
        }
    }

    addMessage(newMessage: Message) {
        this.usersService.addMessage(newMessage);
        this.refreshChatWindow(50);
    }

    // executed when clicked on message input form
    checkUnreadMsgs(event: any) {
        this.refreshChatWindow(1000); // long delay because keyboard is appearing slowly on mobile
        this.usersService.checkUnreadMsgs();
    }

    removeMessage(message: Message) {
        this.openConfirmDialog('Delete message?').then(confirmed => {
            if (!confirmed) return;
            if (!message.id) { // not sent yet
                this.messages = this.messages.filter(msg => msg.timestamp !== message.timestamp);
                return;
            }
            this.usersService.deleteMessage(message).subscribe(
                (msg) => {
                    this.usersService.afterMessageDeleted(message);
                    this.messages = this.messages.filter(msg => msg.id !== message.id);
                }
            );
        });
    }

    openConfirmDialog(dialogText: string): Promise<any> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.viewContainerRef = this.vcr;
        this.dialog = this.mdDialog.open(DialogConfirmComponent, dialogConfig);
        this.dialog.componentInstance.dialogText = dialogText;
        return new Promise((resolve, reject) => {
            this.dialog.afterClosed().subscribe(result => {
                this.dialog = null;
                resolve(result);
            });
        });
    }

    ngOnInit() {
        this.messagesSubscription = this.usersService.messagesUpdated$.subscribe(
            messages => { this.messages = messages; });
        this.refreshWindowSubscription = this.usersService.rescroll$.subscribe(
            r => { this.refreshChatWindow(50); });
    }

    ngOnDestroy() {
        if (this.roomOpened) this.roomOpened.unsubscribe(); // reset subscription
        if (this.roomMessagesGetter) this.roomMessagesGetter.unsubscribe();
        if (this.roomMessagesForPageGetter) this.roomMessagesForPageGetter.unsubscribe();
        if (this.roomCreator) this.roomCreator.unsubscribe();
        if (this.messagesSubscription) this.messagesSubscription.unsubscribe();
        if (this.refreshWindowSubscription) this.refreshWindowSubscription.unsubscribe();
        this.messages = [];
    }
}
