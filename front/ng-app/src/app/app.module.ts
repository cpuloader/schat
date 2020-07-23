import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule } from '@angular/forms';
//import { HttpModule } from '@angular/common/http';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { MatButtonModule, MatMenuModule, MatSidenavModule, MatGridListModule,
         MatInputModule, MatDialogModule, MatTabsModule, MatCardModule, MatIconModule,
         MatToolbarModule, MatProgressBarModule, MatProgressSpinnerModule } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CookieService } from 'ngx-cookie-service';

import { AuthService } from './auth.service';
import { TokenInterceptor } from './token-interceptor';
import { JwtInterceptor } from './jwt-interceptor';
import { AppRoutingModule }    from './app.routes';
import { AuthGuard } from './auth-guard';
import { AppComponent } from './app.component';
import { HomeComponent } from './home.component';
import { ToolbarComponent } from './toolbar.component';
import { ChatWindowComponent } from './chat-window.component';
import { AddMessageComponent } from './add-message.component';
import { LoginComponent } from './login.component';
import { SignupComponent } from './signup.component';
import { UserSettingsComponent } from './user-settings.component';
import { UsersService } from './users.service';
import { WebSocketService } from './websocket.service';
import { WindowRef }      from './window';
import { ChatWindowDirective } from './chat-window.directive';
import { DateFieldPipe }  from './date-field.pipe';
import { CryptoService } from './crypto.service';
import { RoomKeyDialogComponent } from './room-key-dialog.component';
import { SearchUserComponent } from './search-user.component';
import { DialogConfirmComponent } from './dialog-confirm.component';
import { CookieTools } from './cookie-tools.service';
import { ConfigService } from './config';
import { LinkParserDirective } from './links.directive';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

import { PushService } from './push.service';


@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        LoginComponent,
        SignupComponent,
        ToolbarComponent,
        AddMessageComponent,
        ChatWindowComponent,
        ChatWindowDirective,
        UserSettingsComponent,
        DateFieldPipe,
        RoomKeyDialogComponent,
        SearchUserComponent,
        DialogConfirmComponent,
        LinkParserDirective
    ],
    entryComponents: [
        AppComponent,
        UserSettingsComponent,
        RoomKeyDialogComponent,
        SearchUserComponent,
        DialogConfirmComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        //HttpModule,
        HttpClientModule,
        MatButtonModule, MatMenuModule, MatSidenavModule, MatGridListModule, MatInputModule,
        MatDialogModule, MatTabsModule, MatCardModule, MatIconModule, MatToolbarModule,
        MatProgressBarModule, MatProgressSpinnerModule,
        FlexLayoutModule,
        BrowserAnimationsModule,
        AppRoutingModule
        //ServiceWorkerModule.register('/ngsw-worker.js', { enabled: environment.production })
    ],
    providers: [
        ConfigService,
        CookieService,
        AuthGuard,
        AuthService,
        UsersService,
        WebSocketService,
        WindowRef,
        CryptoService,
        CookieTools,
        {
            provide: HTTP_INTERCEPTORS,
            useClass: TokenInterceptor,
            multi: true
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: JwtInterceptor,
            multi: true
        },
        PushService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
