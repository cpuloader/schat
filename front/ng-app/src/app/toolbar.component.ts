import { Component, Input, ViewContainerRef } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material';
import { UserSettingsComponent } from './user-settings.component';
import { SearchUserComponent } from './search-user.component';
import { User } from './json-objects';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { DialogConfirmComponent } from './dialog-confirm.component';

@Component({
    selector: 'toolbar-on-top',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
    dialog: MatDialogRef<any>;
    lang: string;

    @Input() loggedUser: User;

    constructor(private usersService: UsersService,
                private authService: AuthService,
                private vcr: ViewContainerRef,
                private mdDialog: MatDialog) {
    }

    logout() {
        this.authService.logout().subscribe(() => this.usersService.cleanAll() );
    }

    userSettings() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.viewContainerRef = this.vcr;
        this.dialog = this.mdDialog.open(UserSettingsComponent, dialogConfig);
        this.dialog.componentInstance.loggedUser = this.loggedUser;
        this.dialog.afterClosed().subscribe(result => {
            this.dialog = null;
            if (result === "deleteAccount") {
                this.openDeleteConfirmDialog("Delete your account?").then(confirmed => {
                    if (!confirmed) return;
                    this.usersService.deleteUser(this.loggedUser).subscribe(
                        () => {
                            this.authService.logout().subscribe(
                                () => this.usersService.cleanAll()
                            );
                        },
                        error => { console.log("error") }
                    );
                });
            }
        });
    }

    search() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.viewContainerRef = this.vcr;
        this.dialog = this.mdDialog.open(SearchUserComponent, dialogConfig);
        this.dialog.afterClosed().subscribe(result => {
            this.dialog = null;
        });
    }

    openDeleteConfirmDialog(dialogText: string): Promise<any> {
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
}
