import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { User } from './json-objects'
import { AuthService } from './auth.service';

@Component({
    selector: 'login',
    templateUrl: './login.component.html'
})
export class LoginComponent {

    user: User = new User;
    error: any;

    constructor(public router: Router, private authService: AuthService) {}

    login() {
        this.authService.login(this.user.email, this.user.password)
            .subscribe(
                response => {},
                error => {
                    console.log(error);
                    try {
                        if (!error['statusText']) {
                            this.error = { error: 'Not connected!' };
                        } else {
                            this.error = error.error;
                        }
                    }
                    catch(err) {
                        this.error = { error: 'Error!'};
                    }
                }
            );
    }

    signup() {
        this.router.navigate(['signup']);
    }

    ngOnInit() {
        if (this.authService.authenticated()) {
            this.router.navigate(['home']);
        }
    }
}
