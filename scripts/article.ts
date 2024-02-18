// @deno-types="./commonmark.d.ts"
import { Parser, Node } from 'commonmark';
const { stat, readDir, readTextFile } = Deno;

function plainText(node: Node): string {
  let text = '';
  const walker = node.walker();
  let event;
  while ((event = walker.next())) {
    if (event.entering === true && event.node.type === 'text') {
      text += event.node.literal;
    }
  }
  return text;
}

export class Article {
  constructor(public name: string,
              public body: Node,
              public published: Date,
              public lastModified: Date,
              public tags: string[]) {

  }

  private static extractTags(rawname: string): string[] {
    const re = /#([0-9a-zA-Z]+)/g;
    const tags = [];
    for (const match of rawname.matchAll(re) ?? []) {
      tags.push(match?.[1]);
    }
    return [rawname.replaceAll('#', ''), ...tags];
  }

  static async parseDir(dir: string, mapTags?: (e: string) => string[]): Promise<Article[]> {
    const parser = new Parser();
    const articles: Article[] = [];
    for await (const f of readDir(dir)) {
      if (f.isFile === true && f.name.endsWith('.md') === true) {
        const [published, rawname] = f.name.substring(0, f.name.length - 3).split('_', 2);
        const [name, ...tags] = this.extractTags(rawname);
        if (published && name) {
          const ptime = new Date(published);
          const text = await readTextFile(`${dir}/${f.name}`);
          const {mtime} = await stat(`${dir}/${f.name}`);
          const body = parser.parse(text);
          const article = new Article(name,
                                      body,
                                      ptime,
                                      mtime ?? ptime,
                                      [...new Set(mapTags ? tags.flatMap(mapTags) : tags)].sort());
          console.log({ name: article.name, title: article.title, tags: article.tags });
          articles.push(article);
        }
      }
    }

    // sort by published date descending
    articles.sort((a, b) => b.published.getTime() - a.published.getTime());

    return articles;
  }

  get title(): string {
    const walker = this.body.walker();
    let event;
    while ((event = walker.next())) {
      if (event.entering === true && event.node.type === 'heading' && event.node.level === 1) {
        return plainText(event.node);
      }
    }
    return '';
  }

  get imageFilenames(): string[] {
    const imageFilenames: string[] = [];
    const walker = this.body.walker();
    let event;
    while ((event = walker.next())) {
      if (event.entering === true && event.node.type === 'image') {
        const src = event.node.destination;
        if (src && !(src.startsWith('http://') || src.startsWith('https://'))) {
          imageFilenames.push(src);
        }
      }
    }
    return imageFilenames;
  }
}
