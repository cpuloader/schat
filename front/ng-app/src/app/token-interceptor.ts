import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

    constructor(public authService: AuthService) {}

    addToken() {
        let token = this.authService.getToken();
        if (!token) return {};
        return  {
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        }
    }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        request = request.clone(this.addToken());

        return next.handle(request);
    }
}
