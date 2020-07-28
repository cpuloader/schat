import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { User } from './json-objects';
import { ConfigService } from './config';
import { CookieTools } from './cookie-tools.service';

const jwtHelper = new JwtHelperService();

@Injectable()
export class AuthService {
    private normal_userLogged: User;
    private apiUrl: string;

    constructor(private httpClient: HttpClient,
                private router: Router,
                private config: ConfigService,
                private cookieTools: CookieTools) {

        this.apiUrl = this.config.getApiUrl();
    }

    private _userLogged$: BehaviorSubject<User> = new BehaviorSubject(null);
    public set userLogged(user: User) {
        this.normal_userLogged = user;
        this._userLogged$.next(user);
    }
    public get userLogged$(): Observable<User> {
        return this._userLogged$.asObservable();
    }

    public getLoggedUser(): User {
        return this.normal_userLogged;
    }

    public checkLoggedUser() {
        const user = JSON.parse(localStorage.getItem('loggedUser'));
        this.userLogged = user;
    }

    public login(email: string, password: string): Observable<any> {
        const url = `${this.apiUrl}/auth/login/`
        return this.httpClient.post(url, {
            email: email.toLowerCase(),
            password: password
        }).pipe(
        map(res => {
            localStorage.setItem('id_token', res['token']);
            const decodedJwt = jwtHelper.decodeToken(res['token']);
            console.log('decodedJwt', decodedJwt);
            if (decodedJwt) {
                this.normal_userLogged = <User>({
                    id: decodedJwt.user_id,
                    email: decodedJwt.user_id,
                    username: decodedJwt.username
                });
                this.getMe()   // get user details from server immediately
                    .subscribe(user => {
                        localStorage.setItem('loggedUser', JSON.stringify(user));
                        this.normal_userLogged = user;
                        this.router.navigate(['home']);
                        },
                        err => { console.log(err); }
                    );
                }
            },
            (error: any) => error
        ));
    }

    public signup(user: User): Observable<any> {
        const url = `${this.apiUrl}/register`
        return this.httpClient.post(url, user).pipe(
            map(res => {
                this.router.navigate(['login']);
                },
                (error: any) => error
            ));
    }

    public getMe(): Observable<User> {
        const url = `${this.apiUrl}/accounts/${this.normal_userLogged.id}/`
        return this.httpClient.get<User>(url);
    }

    public authenticated(): boolean {
        return !jwtHelper.isTokenExpired(localStorage.getItem('id_token'));
    }

    public getToken(): string {
        return localStorage.getItem('id_token');
    }

    public logout(): void {
        localStorage.clear();
        this.cookieTools.deleteWindowCookie();
        this.normal_userLogged = null;
        this._userLogged$.next(null);
        this.router.navigate(['login']);
    }
}
