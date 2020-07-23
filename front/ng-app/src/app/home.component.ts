import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { MatSidenav } from '@angular/material';
import { Subscription } from 'rxjs';
import { User, Room, Message } from './json-objects';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';
import { ConfigService } from './config';
import { WindowRef } from './window';
import { CookieTools } from './cookie-tools.service';
import { PushService } from './push.service';

@Component({
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {
    defaultProfilePic: string;
    defaultProfilePic_prof: string;
    loggedUser: User;
    users: User[] = [];
    selectedUser: User;
    columns: number = 4;
    connectionColor: string = 'red';
    checkMessage: Message;
    tabChanged: boolean;
    newRoomKeySet: number;
    homeLoaded: string;
    resizeCooldown: boolean = true;
    keyStatus: string = '';
    sidenavMode: string = 'side';

    @ViewChild('sidenav', { static: false }) sidenav: MatSidenav;

    private msgSubscription: Subscription;
    private usersSubscription: Subscription;
    private webSocketStateSub: Subscription;
    private userLoggedSub: Subscription;
    private flagsSubscription: Subscription;
    private selectedUserSub: Subscription;

    constructor(private usersService: UsersService,
                private webSocketService: WebSocketService,
                private windowRef: WindowRef,
                private config: ConfigService,
                private authService: AuthService,
                private cookieTools: CookieTools,
                private pushService: PushService
                ) {

        this.defaultProfilePic = this.config.defaultProfilePicture;
        this.defaultProfilePic_prof = this.config.defaultProfilePicture_prof;
    }

    getImage(user: User): string {
        if (user.avatarimage) {
            return `url(${user.avatarimage.picture_for_profile})`
        }
        return `url(${this.defaultProfilePic_prof})`;
    }

    @HostListener('window:resize', [])
    checkWidth() {
        if (!this.resizeCooldown) { return };
        this.resizeCooldown = false;                        // resize only once in 1 sec
        setTimeout(() => this.resizeCooldown = true, 1000);
        const width = this.windowRef.nativeWindow.innerWidth;
        if (width >= 1200) {
            this.columns = 4;
        } else if (width >= 992) {
            this.columns = 3;
        } else if (width >= 630) {
            this.columns = 2;
        } else {
            this.columns = 1;
        }
    }

    // reget info on window refocus
    @HostListener('window:focus', [])
    windowFocusChanged(): void {
        if (!this.windowRef.nativeWindow.hidden && this.cookieTools.windowFocusTimeExpired()) {
            this.cookieTools.setWindowCookie(); // set cookie with new time
            this.usersService.getAllUsers(); // reget all users to grid and new messages
        }
    }

    showModelDetails(user: User) {
        this.selectedUser = user;
        this.sidenav.open();
    }

    // for rescroll in Messages window
    tabFocusChanged(event: any) {
        if (event.index === 1) this.tabChanged = !this.tabChanged;
    }

    // subscription for incoming ws messages from all rooms
    subscribeToIncomingMessages() {
        this.msgSubscription = this.webSocketService.messages
            .subscribe(
                (msg: Message) => {
                    this.connectionColor = 'LawnGreen';
                    this.usersService.incomingMessageCheck(msg);

                },
                err => {
                    this.connectionColor = 'OrangeRed';
                    console.log('connection lost');
                }
            );
    }

    setNewSecretKey() {
        const currentRoom = this.usersService.getCurrentRoom();
        if (!currentRoom || !this.selectedUser) {
            console.log('no key');
            this.keyStatus = 'Chat is not loaded or created yet';
            setTimeout(() => {this.keyStatus= ''}, 5000);
        }
        else {
            const userId = this.selectedUser.id;
            const index = currentRoom.members.findIndex(
                     function(m) {return m.id === userId;});
            if (index > -1) {
                this.newRoomKeySet = Math.random();    // trigger dialog opener
            } else {
                this.keyStatus = 'Chat is not loaded or created yet';
                setTimeout(() => {this.keyStatus= ''}, 5000);
            }

        }
    }

    onGetFreshUserSuccess(freshUser: User) {
        this.loggedUser = freshUser;
        this.authService.userLogged = freshUser;
        this.sidenavMode = this.config.checkWindowSize();
        this.userLoggedSub = this.authService.userLogged$.subscribe(user => {    // subscribe to future user changes
            this.loggedUser = user;
        });
        this.checkWidth();                     // to get number of columns
        this.usersSubscription = this.usersService.usersUpdated$  // subscribe to users updated
            .subscribe(users => {
                this.users = users;     // get updated users with new messages
            });
        this.usersService.getAllUsers();                    // get all users to grid and info for new messages indicators
        this.webSocketService.openRoom(this.loggedUser.id);    // start websocket session
        this.webSocketStateSub = this.webSocketService.socketState$.subscribe(
            res => {
                if (res === 'connect') {
                    this.subscribeToIncomingMessages(); // subscribe to messages
                    this.connectionColor = 'Orange';
                } else if (res === 'disconnect' && this.msgSubscription) {
                    this.connectionColor = 'OrangeRed';
                    this.msgSubscription.unsubscribe();  // unsubscribe from messages
                }
            });
        this.flagsSubscription = this.usersService.flagsUpdate$.subscribe(
            flag => {
                switch (flag) {
                    case 'homeloaded': { this.homeLoaded = 'homeloaded'; break; }
                    case 'opensidenav': { this.sidenav.open(); break; }
                }
            });
        this.selectedUserSub = this.usersService.openRoom$.subscribe(
            user => {
              if (user) this.selectedUser = user;
            });
        this.cookieTools.setWindowCookie(); // set cookie with new time
    }

    ngOnInit() {
        this.authService.checkLoggedUser();
        if (!this.authService.getLoggedUser() || !this.authService.authenticated()) {
            this.authService.logout();
            this.usersService.cleanAll();
        } else {
            this.userLoggedSub = this.authService.getMe().subscribe(
                res => {
                    //console.log('fresh user:', res);
                    this.userLoggedSub.unsubscribe();
                    this.onGetFreshUserSuccess(res);
                },
                (error: any) => {
                    //console.log('user error:', error);
                    this.authService.logout();
                    this.usersService.cleanAll();
                }
            );
        }

    }

    ngOnDestroy() {
        this.webSocketService.closeRoom(true);
        if (this.usersSubscription) this.usersSubscription.unsubscribe();
        if (this.webSocketStateSub) this.webSocketStateSub.unsubscribe();
        if (this.userLoggedSub) this.userLoggedSub.unsubscribe();
        if (this.flagsSubscription) this.flagsSubscription.unsubscribe();
        if (this.msgSubscription) this.msgSubscription.unsubscribe();
        if (this.selectedUserSub) this.selectedUserSub.unsubscribe();
        this.users = [];
        this.cookieTools.deleteWindowCookie();
    }
}
