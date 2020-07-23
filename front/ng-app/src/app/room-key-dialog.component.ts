import { Component, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { User, Room, Message } from './json-objects';
import { CryptoService } from './crypto.service';

@Component({
    selector: 'room-key-dialog',
    templateUrl: './room-key-dialog.component.html',
    styleUrls: ['./room-key-dialog.component.scss']
})
export class RoomKeyDialogComponent {
    roomKey: string = '';
    label: string;
    wasCancelled: boolean = true;

    @ViewChild('textInput', { static: false }) input: ElementRef;
    //@HostListener('window:keyup.esc') onKeyUp() { this.dialogRef.close(); }

    constructor(private cryptoService: CryptoService,
                private mdDialogRef: MatDialogRef<RoomKeyDialogComponent>) {
        mdDialogRef.disableClose = true; // do not close by click outside
    }

    setRoomKey(): void {
        this.cryptoService.setKey(this.roomKey, this.label);
        this.wasCancelled = false;
        this.mdDialogRef.close();
    }

}
