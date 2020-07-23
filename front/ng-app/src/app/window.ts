import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

function _window() : any {
   // return the global native browser window object
   return window;
}

@Injectable()
export class WindowRef {
    constructor(@Inject(DOCUMENT) public document: any) {}

    get nativeWindow() : any {
        return _window();
    }
}
