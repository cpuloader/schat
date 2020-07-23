import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material';
import { User } from './json-objects'
import { UsersService } from './users.service';
import { ConfigService } from './config';

@Component({
    selector: 'search-user-dialog',
    templateUrl: './search-user.component.html',
    styleUrls: ['./search-user.component.scss'],
})
export class SearchUserComponent {
    defaultProfilePic: string;
    user: User;
    error: any;
    email: string;
    found: string = '';

    constructor(private mdDialogRef: MatDialogRef<SearchUserComponent>,
                private usersService: UsersService,
                private config: ConfigService) {

        this.defaultProfilePic = this.config.defaultProfilePicture_prof;
    }

    getImage(): string {
        if (this.user.avatarimage.picture_for_profile) {
            return `url(${this.user.avatarimage.picture_for_profile})`
        }
        return `url(${this.defaultProfilePic})`;
    }

    search() {
        this.usersService.getUsers(this.email).subscribe(
            users => {
                if (users.length) {
                    this.user = users[0];
                    this.found = 'found';
                } else {
                    this.user = null;
                    this.found = 'notfound';
                }
                this.email = null;
            });
    }

    openChatRoom() {
        this.usersService.openRoomForUser(this.user);
        this.mdDialogRef.close();
    }

    ngOnDestroy() {
        this.user = null;
    }
}
