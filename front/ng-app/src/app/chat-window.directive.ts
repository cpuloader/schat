import { Directive, ElementRef, Renderer2, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
    selector: '[autoscrollWindow]',
})
export class ChatWindowDirective implements OnChanges {
    constructor(private el: ElementRef, private renderer: Renderer2) {}

    @Input()
    redrawWindow: boolean;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['redrawWindow']) {
            this.autoscroll();
        }
    }

    private autoscroll() {
        this.renderer.setProperty(this.el.nativeElement, 'scrollTop', this.el.nativeElement.scrollHeight)
    }
}
