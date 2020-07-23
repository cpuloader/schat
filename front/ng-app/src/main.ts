//import { enableProdMode, TRANSLATIONS, TRANSLATIONS_FORMAT, MissingTranslationStrategy } from '@angular/core';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// use the require method provided by webpack
//declare const require;
// we use the webpack raw-loader to return the content as a string
//const translations = require(`raw-loader!./locale/messages.ru.xlf`);

platformBrowserDynamic().bootstrapModule(AppModule)
/*  .then(() => {
    if ('serviceWorker' in navigator && environment.production) {
      navigator.serviceWorker.register('/ngsw-worker.js');
    }
})*/
.catch(err => console.log(err));
