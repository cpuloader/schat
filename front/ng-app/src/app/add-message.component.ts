import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { User, Room, Message } from './json-objects';
import { WindowRef } from './window';

@Component({
    selector: 'add-message',
    templateUrl: './add-message.component.html',
    styleUrls: ['./add-message.component.scss']
})
export class AddMessageComponent {
    message: string = '';
    cooldown: boolean = true;
    isMobile: boolean;

    @Input() loggedUser: User;
    @Output() messageCreated: EventEmitter<Message> = new EventEmitter<Message>();
    @Output() inputFocused: EventEmitter<boolean> = new EventEmitter<false>();
    @Output() setRoomKey: EventEmitter<boolean> = new EventEmitter<false>();

    @ViewChild('textInput', { static: false }) input: ElementRef;

    constructor(private windowRef: WindowRef) {
        if (this.windowRef.nativeWindow.innerWidth <= 480) this.isMobile = true;
    }

    sendMessage(): void {
        if (!this.cooldown) { return };
        this.cooldown = false;                        // you can send only 1 msg in 2 sec
        setTimeout(() => this.cooldown = true, 1000);
        let newMessage = new Message();
        newMessage.author = this.loggedUser;
        newMessage.message = this.message;
        newMessage.timestamp = new Date();
        newMessage.checked = false;
        this.messageCreated.emit(newMessage);
        this.inputFocused.emit(true);
        this.input.nativeElement.focus();
        setTimeout(() => this.message ='', 50);
    }

    setNewRoomKey() {
        this.setRoomKey.emit(true);
    }

    notifyFocus() {
        this.inputFocused.emit(true);
    }
}
