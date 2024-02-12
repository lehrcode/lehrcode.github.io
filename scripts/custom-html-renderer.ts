// @deno-types="./commonmark.d.ts"
import { HtmlRenderer, HtmlRenderingOptions, Node } from "commonmark";
import hljs from "highlightjs";
import { parse as parseCsv } from "csv";

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

  private csv_table(values: string[][], cls?: string): void {
    const cols = values.reduce((c, row) => Math.max(c, row.length), 0);
    let first = true;
    this.tag("div", [["class", "table-wrapper"]]);
    if (cls) {
      this.tag("table", [["class", this.esc(cls)]]);
    } else {
      this.tag("table");
    }
    for (const row of values) {
      if (row.length === 0) {
        continue;
      }
      this.tag("tr");
      let cellTag = 'td';
      if (first === true) {
        cellTag = 'th';
        first = false;
      }
      if (row.length === 1) {
        this.tag(cellTag, [['colspan', `${cols}`]]);
        this.out(row[0]);
        this.tag(`/${cellTag}`);
      } else {
        for (const cell of row) {
          this.tag(cellTag);
          this.out(cell);
          this.tag(`/${cellTag}`);
        }
      }
      this.tag("/tr");
    }
    this.tag("/table");
    this.tag("/div");
  }
}
