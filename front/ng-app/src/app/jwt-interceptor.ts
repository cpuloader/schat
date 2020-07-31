import { Injectable } from '@angular/core';
import { HttpResponse, HttpErrorResponse, HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { Observable, pipe } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

    constructor(public authService: AuthService, public usersService: UsersService) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        return next.handle(request).pipe(
            tap((event: HttpEvent<any>) => {
                //if (event instanceof HttpResponse) {}
            }, (err: any) => {
                if (err instanceof HttpErrorResponse) {
                    if (err.status === 401) {
                        this.authService.logout();
                        this.usersService.cleanAll();
                        console.log('JwtInterceptor: unauthorized');
                    }
                }
            })
        );
    }
}
