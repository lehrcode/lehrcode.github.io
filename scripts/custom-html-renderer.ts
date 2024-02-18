// @deno-types="./commonmark.d.ts"
import { HtmlRenderer, HtmlRenderingOptions, Node } from "commonmark";
import hljs from "highlightjs";

export class CustomHtmlRenderer extends HtmlRenderer {
  constructor(options?: HtmlRenderingOptions) {
    super(options);
  }

  override code_block(node: Node): void {
    const infoWords = node.info ? node.info.split(/\s+/) : [];
    const attrs = this.attrs(node);
    let lang: string | null = null;
    if (infoWords.length > 0 && infoWords[0].length > 0) {
      lang = this.esc(infoWords[0]);
      let cls = lang;
      if (!/^language-/i.exec(lang)) {
        cls = "language-" + lang;
      }
      attrs.push(["class", cls]);
    }
    this.cr();
    if (lang) {
      if (lang?.toLowerCase() === 'mermaid') {
        this.tag("pre", [["class", "mermaid"]]);
        this.out(node.literal ?? '');
        this.tag("/pre");
      } else {
        this.tag("pre");
        this.tag("code", attrs);
        if (infoWords.length > 0 && infoWords[0].length > 0) {
          this.lit(hljs.highlight(node.literal ?? '', { language: infoWords[0] }).value)
        } else {
          this.text(node);
        }
        this.tag("/code");
        this.tag("/pre");
      }
    } else {
      this.tag("pre");
      this.tag("code", attrs);
      if (infoWords.length > 0 && infoWords[0].length > 0) {
        this.lit(hljs.highlight(node.literal ?? '', { language: infoWords[0] }).value)
      } else {
        this.text(node);
      }
      this.tag("/code");
      this.tag("/pre");
    }
    this.cr();
  }
}
