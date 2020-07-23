import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dateFieldPipe',
})
export class DateFieldPipe implements PipeTransform {
    transform(value: any) {
        if (!value) return value;
        let month = value.getMonth() + 1;
        let d = value.getDate();
        let h = value.getHours();
        let m = value.getMinutes();
        let s = value.getSeconds();
        month = (month > 9) ? month : '0' + month;
        d = (d > 9) ? d : '0' + d;
        h = (h > 9) ? h : '0' + h;
        m = (m > 9) ? m : '0' + m;
        s = (s > 9) ? s : '0' + s;
        return value.getFullYear() + '.' + month + '.' +
               d + ' ' + h + ':' + m + ':' + s;
    }
}
