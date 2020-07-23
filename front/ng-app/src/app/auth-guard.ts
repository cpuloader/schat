import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
//import { tokenNotExpired } from '@auth0/angular-jwt';
import { JwtHelperService } from '@auth0/angular-jwt';

const jwtHelper = new JwtHelperService();

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private router: Router) {}

    canActivate() {
        // check user's JWT
        let tokenCheck = localStorage.getItem('id_token');
        if (!tokenCheck) {
            return false;    // must be false!!!!!
        }
        if (!jwtHelper.isTokenExpired(tokenCheck)) {
            return true;
        }

        this.router.navigate(['/login']);
        return false;
    }
}
