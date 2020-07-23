import { Directive, OnChanges, Input, ElementRef, Renderer2, SimpleChanges } from '@angular/core';

@Directive({
    selector: '[linkParser]'
})
export class LinkParserDirective implements OnChanges {

  @Input('linkParser') content: string;
  @Input('detail') detail: boolean;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
      if (changes['content'] && changes['content'].currentValue) {
          this.parseHttpLinks();
      }
  }

  parseHttpLinks(): void {
      const linkTemplate = new RegExp(/(\b(https|http)\b:\/\/[^\s]*)|(<iframe.+<\/iframe>)/);
      this.el.nativeElement.innerHTML = '';            // clear element html, we will rebuild it
      let tempContent: string;
      if (this.detail === true) {        // in layout view, we will check only first 400 sybmbols
          //console.log('post detail');
          tempContent = this.content.slice(0);
      } else {
          //console.log('layout');
          tempContent = this.content.slice(0, 400);
      }
      //tempContent = tempContent.replace(/<script.*<\/script>/g, '');
      let firstLinkElement: boolean;
      if (!this.detail) {
          firstLinkElement = true;   // we will show first element only in layout view to save space
      }
      while (true) {
          let result = tempContent.match(linkTemplate);  // check if content has links or iframes
          if (result) {
              let textBefore = this.renderer.createElement('span');    // we will wrap all text in span tags
              textBefore.innerHTML = tempContent.slice(0, result.index).replace(/[\r\n]+/g, '<br/>'); // replace cr with br tags
              //textBefore.text = tempContent.slice(0, result.index)
              this.renderer.appendChild(this.el.nativeElement, textBefore); // add element with text before link
              let parsedHtml: any;
              if (result[0].indexOf('<iframe') > -1) {
                  //console.log('found iframe');
                  parsedHtml = this.renderer.createElement('div');       // wrap iframe in divs
                  //parsedHtml.innerHTML = result[0];             // turn off iframes now
              } else {
                  //console.log('found link');
                  if (result[0].match(/.+(jpeg|jpg|gif|png)\b/i)) {           // check if it's image link
                      if (firstLinkElement) {
                          let imgBr = this.renderer.createElement('br');         // make br
                          this.renderer.appendChild(this.el.nativeElement, imgBr); // add br
                      }
                      parsedHtml = this.renderer.createElement('img');         // make image tag
                      parsedHtml.src = result[0];
                  } else {
                      firstLinkElement = true;  // always true for http links
                      parsedHtml = this.renderer.createElement('a');         // make link tag
                      parsedHtml.href = result[0].replace(' ', '');
                      if (result[0].length > 40) {                           // truncate long link text
                          parsedHtml.text = result[0].slice(result[2].length + 3, 40) + '...';
                      } else {
                          parsedHtml.text = result[0].slice(result[2].length + 3);
                      }
                  }
              }
              //console.log('found: ', result, 'created: ', parsedHtml);
              tempContent = tempContent.slice(result.index + result[0].length);
              if (!firstLinkElement && !this.detail) { continue; }    // don't add not first element in layout view
              this.renderer.appendChild(this.el.nativeElement, parsedHtml); // add link element
              firstLinkElement = false;                               // set flag to false
          } else {
              //console.log('stop!');
              let textAfter = this.renderer.createElement('span');      // add remaining text (or all if no links or iframes)
              textAfter.innerHTML = tempContent.replace(/[\r\n]+/g, '<br/>'); // replace CRs with BR
              //textAfter.text = tempContent
              this.renderer.appendChild(this.el.nativeElement, textAfter); // add element with text
              break;
          }
      }
  }
}
