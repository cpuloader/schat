import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { ConfigService } from './config';

@Injectable()
export class CookieTools {
    constructor(private cookieService: CookieService, private config: ConfigService) {}

    setWindowCookie() {
      this.deleteWindowCookie();
      let expireDate = new Date();
      expireDate.setHours(expireDate.getHours() + 1);  // set cookies for 1 hour
      this.cookieService.set('lastwindowfocus', 'focus', expireDate);
    }

    deleteWindowCookie() {
      this.cookieService.delete('lastwindowfocus');
    }

    windowFocusTimeExpired(): boolean {
      const cookie = this.cookieService.get('lastwindowfocus');
      if (!cookie) return true;
      else return false;
    }

    setAuthorization(token: string) {
      let expireDate = new Date();
      expireDate.setHours(expireDate.getHours() + 1);  // set cookies for 1 hour - test
      this.cookieService.set('Authorization', token, expireDate);//, '/',
                             //this.config.getHost(), false, 'Lax');
    }
}
