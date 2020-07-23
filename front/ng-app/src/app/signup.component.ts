import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { User } from './json-objects'
import { AuthService } from './auth.service';

@Component({
    selector: 'signup',
    templateUrl: './signup.component.html'
})
export class SignupComponent {
    user: User = new User;
    error: any;

    constructor(private router: Router, private authService: AuthService) {}

    signup() {
        this.error = undefined;
        this.authService.signup(this.user)
            .subscribe(
                response => {},
                error => {
                    //console.log(error);
                    try {
                        this.error = error.error;
                        if (error.status == 0) {
                            this.error = { error: 'Not connected!' };
                        }
                    }
                    catch(err) {
                        this.error = { error: 'Error!'};
                    }
                }
            );
    }

    login() {
        this.router.navigate(['login']);
    }
}
