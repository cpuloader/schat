import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { WindowRef } from './window';

var DEBUG: boolean;

if (environment.production) {
    DEBUG = false;
} else { DEBUG = true; }

@Injectable()
export class ConfigService {
    constructor(private windowRef: WindowRef) {}

    static: string = "/static";
    media: string = "/media";
    debug: boolean = DEBUG;
    host: string = '127.0.0.1:8000';
    defaultProfilePicture: string = this.media + '/def_avatar_pics/default_ava.jpg';
    defaultProfilePicture_prof: string = this.media + '/def_avatar_pics/profile/default_ava_profile.jpg';
    defaultProfilePicture_mini: string = this.media + '/def_avatar_pics/preview/default_ava_preview.jpg';

    // pagination, must be equal in backend
    pageSize: number = 30;
    // interval to get new messages by http requests (for double check if websockets off)
    http_request_time = 1000 * 60 * 5;

    vapid_public: string = "BB9jpW7WZEW0hQMAiD_FD7YCD79DOzDt9R9cHHYyzh_KsHGe6GlwqxejN345wZPTaiLZzdyYKHCrzSaIPCCEET4";

    public getHost(): string {
        return this.debug ? this.host : this.windowRef.nativeWindow.location.host;
    }

    public getWSScheme(): string {
        return this.windowRef.nativeWindow.location.protocol == 'https:' ? 'wss:' : 'ws:';
    }

    public getApiUrl(): string {
        return this.windowRef.nativeWindow.location.protocol + '//' + this.getHost() + '/api/v1';
    }

    public getChatUrl(): string {
        return this.getWSScheme() + '//' + this.getHost() + '/chat';
    }

    public checkWindowSize(): string {
        return (this.windowRef.nativeWindow.innerWidth > 400) ? 'side' : 'over';
    }
}
