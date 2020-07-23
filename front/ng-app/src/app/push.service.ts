import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ConfigService } from './config';

@Injectable()
export class PushService {

  private API_URL: string
  private vapid_public: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.API_URL = this.configService.getApiUrl();
    this.vapid_public = this.configService.vapid_public;
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  addSubscriber(subscription) {

    const url = `${this.API_URL}/webpush`;
    console.log('[Push Service] Adding subscriber')

    let body = {
      action: 'subscribe',
      subscription: subscription
    }

    return this.http
      .post(url, body).pipe(
          catchError(this.handleError)
      );

  }

  deleteSubscriber(subscription) {

    const url = `${this.API_URL}/webpush`;
    console.log('[Push Service] Deleting subscriber')

    let body = {
      action: 'unsubscribe',
      subscription: subscription
    }

    return this.http
      .post(url, body).pipe(
          catchError(this.handleError)
      );

  }

  private handleError(error: Response | any) {
    let errMsg: string;
    if (error instanceof Response) {
      errMsg = `${error.statusText || 'Network error'}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    return throwError(errMsg);
  }

}