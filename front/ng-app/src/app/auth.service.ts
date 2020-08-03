import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from './json-objects';
import { ConfigService } from './config';
import { CookieTools } from './cookie-tools.service';
import { HeadersService } from './headers.service';


@Injectable()
export class AuthService {
    private normal_userLogged: User;
    private apiUrl: string;

    constructor(private httpClient: HttpClient,
                private router: Router,
                private config: ConfigService,
                private headers: HeadersService,
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
        const url: string = `${this.apiUrl}/auth/login/`
        return this.httpClient.post<User>(url, {
            email: email.toLowerCase(),
            password: password
        }, { headers: this.headers.makeCSRFHeader() }).pipe(
            map(user => {
                    localStorage.setItem('loggedUser', JSON.stringify(user));
                    this.normal_userLogged = user;
                    this.router.navigate(['home']);
                },
                (error: any) => error
            ));
    }

    public signup(user: User): Observable<any> {
        const url = `${this.apiUrl}/register`
        return this.httpClient.post(url, user, { headers: this.headers.makeCSRFHeader() })
          .pipe(
              map(res => this.router.navigate(['login']) )
          );
    }

    logout(): Observable<any> {
        const url: string = `${this.apiUrl}/auth/logout/`;
        return this.httpClient.post(url, {}, { headers: this.headers.makeCSRFHeader() })
          .pipe(
              map(res => this.afterLogout(res) )
          ).pipe(
              catchError(err => this.afterLogout(err) ) // clean all in any case
          );
    }

    public getMe(): Observable<User> {
        const url = `${this.apiUrl}/accounts/${this.normal_userLogged.id}/`
        return this.httpClient.get<User>(url);
    }

    public authenticated(): boolean {
        return !!localStorage.getItem('loggedUser');
    }

    unauthenticate(): void {
        this.normal_userLogged = undefined;
        localStorage.clear();
    }

    public afterLogout(res: any): any {
        localStorage.clear();
        this.cookieTools.cleanAll();
        this.normal_userLogged = null;
        this._userLogged$.next(null);
        this.router.navigate(['login']);
        return res;
    }
}
