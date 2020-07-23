import { HttpHeaders } from '@angular/common/http';

export const contentHeaders = new HttpHeaders();
contentHeaders.set('Accept', 'application/json');
contentHeaders.set('Content-Type', 'application/json');
//contentHeaders.append('Access-Control-Allow-Origin', '*');