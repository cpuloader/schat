import { Injectable } from '@angular/core';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class HeadersService {

  constructor(private cookieService: CookieService) {}

  handleErrorDetails(response: any): any {
    if (response.hasOwnProperty('error') && response.error.hasOwnProperty('details')) {
      return response.error.details;
    } else {
      return 'Error!';
    }
  }

  makeCSRFHeader(): HttpHeaders {
    const csrf = this.cookieService.get('csrftoken');
    return new HttpHeaders({"X-CSRFToken": csrf});
  }

  makeCSRFandContentHeader(): HttpHeaders {
    const csrf = this.cookieService.get('csrftoken');
    return new HttpHeaders({"X-CSRFToken": csrf, "Content-Type": "application/json"});
  }
}
