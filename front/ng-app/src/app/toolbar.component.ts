import { Component, Input, ViewContainerRef } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material';
import { UserSettingsComponent } from './user-settings.component';
import { SearchUserComponent } from './search-user.component';
import { User } from './json-objects';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

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

    userSettings() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.viewContainerRef = this.vcr;
        this.dialog = this.mdDialog.open(UserSettingsComponent, dialogConfig);
        this.dialog.componentInstance.loggedUser = this.loggedUser;
        this.dialog.afterClosed().subscribe(result => {
            this.dialog = null;
        });
    }

    logout() {
        this.authService.logout().subscribe(() => this.usersService.cleanAll() );
    }

    search() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.viewContainerRef = this.vcr;
        this.dialog = this.mdDialog.open(SearchUserComponent, dialogConfig);
        this.dialog.afterClosed().subscribe(result => {
            this.dialog = null;
        });
    }
}
