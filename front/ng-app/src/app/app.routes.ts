import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home.component';
import { LoginComponent } from './login.component';
import { SignupComponent } from './signup.component';
import { UserSettingsComponent } from './user-settings.component';
import { AuthGuard } from './auth-guard';

const routes: Routes = [
    { path: '',       component: LoginComponent },
    { path: 'login',  component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'home',   component: HomeComponent, canActivate: [AuthGuard] },
    { path: 'settings', component: UserSettingsComponent, canActivate: [AuthGuard] },
    { path: '**',     component: LoginComponent },
];

@NgModule({
    imports: [ RouterModule.forRoot(routes, {
        useHash: true }) ],
    exports: [ RouterModule ]
})

export class AppRoutingModule {}
