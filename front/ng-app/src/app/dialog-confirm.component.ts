import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material';

@Component({
    selector: 'dialog-confirm',
    templateUrl: './dialog-confirm.component.html',
    styleUrls: ['./dialog-confirm.component.scss'],
})
export class DialogConfirmComponent {
    dialogText: string;

    constructor(private mdDialogRef: MatDialogRef<DialogConfirmComponent>) {}

    confirm() {
        this.mdDialogRef.close(true);
    }
}
