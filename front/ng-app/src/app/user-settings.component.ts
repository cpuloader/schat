import { Component, OnInit } from '@angular/core';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material';
import { User } from './json-objects'
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { ConfigService } from './config';

@Component({
    selector: 'user-settings',
    templateUrl: './user-settings.component.html',
    styleUrls: ['./user-settings.component.scss'],
})
export class UserSettingsComponent implements OnInit {
    loggedUser: User;
    user: User;
    error: any;
    defaultProfilePic:string;
    avaUploadProgress: number;
    uploading: boolean;
    preparing: boolean;
    private userUpdater: Subscription;
    private avatarUpdater: Subscription;

    constructor(private mdDialogRef: MatDialogRef<UserSettingsComponent>,
                private config: ConfigService,
                private usersService: UsersService,
                private authService: AuthService) {

        this.defaultProfilePic = this.config.defaultProfilePicture_prof;
    }

    update() {
      this.error = undefined;
      this.userUpdater = this.usersService.updateUser(this.user).subscribe(
          user => {
              this.user = user;
              localStorage.setItem('loggedUser', JSON.stringify(user));
              this.authService.userLogged = user;        // send changed user to service
              setTimeout(() => this.mdDialogRef.close(), 50);
          },
          error => {
              try {
                  this.error = error.error;
              }
              catch(err) {
                  this.error = { error: 'Error!'};
              }
          }
          );
    }

    updateAvatar(event: any): void {
        this.error = undefined;
        let file: File = event.target.files[0];
        if (!file) {
            return;
        }
        let ext = file.name.toLowerCase();
        if (ext.lastIndexOf('jpg') == -1 && ext.lastIndexOf('jpeg') == -1 &&
              ext.lastIndexOf('gif') == -1 && ext.lastIndexOf('png') == -1) {
            console.log('Wrong file type! JPG, GIF, PNG only.');
            return;
        }
        if (file['size'] && file.size > 1024*1024*5) {
            this.error = { error: 'File is too big, should be < 5 MB'};
            console.log(file, 'File is too big, should be < 5 MB');
            return;
        }
        this.uploading = true;                // show 'uploading' progress bar
        this.avatarUpdater = this.usersService.updateAvatar(file).subscribe(
            event => {
                if (event.type === HttpEventType.UploadProgress) {
                    const progress = Math.round(100 * event.loaded / event.total);
                    if (progress < 99) {
                        this.avaUploadProgress = progress;
                    } else {
                        this.uploading = false;
                        this.preparing = true;       // show 'preparing' progress bar
                    }
                } else if (event instanceof HttpResponse) {
                    if (event.status == 201) {
                        this.user.avatarimage = event.body;
                        console.log(event.body, this.user);
                        localStorage.setItem('loggedUser', JSON.stringify(this.user)); // update user in storage
                        this.user = JSON.parse(localStorage.getItem('loggedUser'));
                        this.preparing = false;
                        this.authService.userLogged = this.user; // send obs to service to update user
                    } else {
                        this.uploading = false;
                        this.preparing = false;
                        try {
                            this.error = event.body.error;
                        }
                        catch(err) {
                            this.error = { error: 'Error!'};
                        }
                    }
                }
            });
    }

    deleteAcc() {
        setTimeout(() => this.mdDialogRef.close("deleteAccount"), 50);
    }

    ngOnInit() {
        this.user = JSON.parse(JSON.stringify(this.loggedUser));  // make copy to not detect changes
    }

    ngOnDestroy() {
        if (this.userUpdater) this.userUpdater.unsubscribe();
        if (this.avatarUpdater) this.avatarUpdater.unsubscribe();
    }
}
