import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
//import { JwtHelperService } from '@auth0/angular-jwt';
import { AuthService } from './auth.service';

//const jwtHelper = new JwtHelperService();

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private router: Router, private authService: AuthService) {}

    canActivate() {
        // check user's JWT
        /*let tokenCheck = localStorage.getItem('id_token');
        if (!tokenCheck) {
            return false;
        }
        if (!jwtHelper.isTokenExpired(tokenCheck)) {
            return true;
        }*/
        if (this.authService.authenticated()) return true;

        this.router.navigate(['/login']);
        return false;
    }
}
