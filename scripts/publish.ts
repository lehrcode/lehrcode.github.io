import Handlebars from 'handlebars';
// @deno-types="@types/csso"
import { minify } from 'csso';
import { CustomHtmlRenderer } from './custom-html-renderer.ts';
import { Article } from "./article.ts";
// @deno-types="./commonmark.d.ts"
import { Node } from 'commonmark';
const { mkdir, readDir, readTextFile, writeTextFile, copyFile } = Deno;

function mapTags(tag: string): string[] {
  switch(tag.toLowerCase()) {
    case 'go':
      return ['golang'];
    case 'js':
      return ['javascript'];
    case 'pg':
    case 'postgres':
      return ['postgresql'];
    case 'py':
      return ['python'];
    case 'tornado':
      return ['python', 'tornado'];
    case 'ts':
      return ['typescript'];
    default:
      return [tag.toLowerCase()];
  }
}

const renderer = new CustomHtmlRenderer();

Handlebars.registerHelper('fullDate', (date: Date) => date.toLocaleDateString('de-DE', { dateStyle: 'full' }));
Handlebars.registerHelper('isoDate', (date: Date) => date.toISOString().split('T')[0]);
Handlebars.registerHelper('rssDate', (date: Date) => date.toUTCString());
Handlebars.registerHelper('shortDate', (date: Date) => date.toLocaleDateString('de-DE', { dateStyle: 'medium' }));
Handlebars.registerHelper('md', (node: Node) => renderer.render(node));
Handlebars.registerHelper('usesMermaid', (node: Node) => {
  const walker = node.walker();
  let event;
  while ((event = walker.next())) {
    if (event.entering === true && event.node.type === 'code_block' && event.node.info?.includes('mermaid')) {
      return true;
    }
  }
  return false;
});
Handlebars.registerHelper('join', (strings: string[]) => strings.join(', '));
Handlebars.registerPartial('layout', Handlebars.compile(await readTextFile('templates/_layout.hbs')));

const templateOptions = {allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true};
const articleTemplate = Handlebars.compile(await readTextFile('templates/article.hbs'));
const indexTemplate = Handlebars.compile(await readTextFile('templates/index.hbs'));


const tutorials: Article[] = await Article.parseDir('tutorials', mapTags);
const tags: string[] = [...new Set(tutorials.flatMap(a => a.tags))].sort();

for (const a of tutorials) {
  const targetDir = `public/${a.name}`;
  await mkdir(targetDir, { recursive: true, mode: 0o755 });
  console.log(`${targetDir}/index.html`);
  await writeTextFile(`${targetDir}/index.html`, articleTemplate(a, templateOptions));
  for (const img of a.imageFilenames) {
    if (img.indexOf('/') > -1) {
      const path = img.substring(0, img.lastIndexOf('/'));
      console.log(`${targetDir}/${path}`);
      await mkdir(`${targetDir}/${path}`, { recursive: true, mode: 0o755 });
    }
    console.log(`${targetDir}/${img}`);
    await copyFile(`tutorials/${img}`, `${targetDir}/${img}`);
  }
}

// ----- Fonts & Style Sheets -----

const cssFiles: string[] = [];
const styles: string[] = [];

for await (const f of readDir('styles')) {
  if (f.isFile === true && f.name.endsWith('.css') === true && f.name.endsWith('.min.css') === false) {
    cssFiles.push(f.name);
  }
}
cssFiles.sort();
for (const filename of cssFiles) {
  styles.push(await readTextFile(`styles/${filename}`));
}

await mkdir('public/fonts', { recursive: true, mode: 0o755 });
for await (const f of readDir('fonts')) {
  if (f.isFile === true && f.name.endsWith('.woff') === true) {
    console.log(`public/fonts/${f.name}`);
    await copyFile(`fonts/${f.name}`, `public/fonts/${f.name}`);
  }
}

await mkdir('public/styles', { recursive: true, mode: 0o755 });
for await (const f of readDir('styles')) {
  if (f.isFile === true && f.name.endsWith('.min.css') === true) {
    console.log(`public/styles/${f.name}`);
    await copyFile(`styles/${f.name}`, `public/styles/${f.name}`);
  }
}
console.log('public/styles/bundle.min.css');
await writeTextFile('public/styles/bundle.min.css', minify(styles.join('\n'), {comments: 'exclamation'}).css);

// ----- Images -----

console.log('public/favicon.ico');
await copyFile('images/favicon.ico', 'public/favicon.ico');

// ----- Pages -----

//console.log('public/impressum.html');
//await writePage('pages/impressum.md', 'public/impressum.html', 'Impressum und Datenschutz');

console.log('tags: ', tags);
const tutorialsByTag: {tag: string, tutorials: Article[]}[] = [];
for (const tag of tags) {
  tutorialsByTag.push({tag, tutorials: tutorials.filter(a => a.tags.includes(tag))});
}
console.log('public/index.html');
await writeTextFile('public/index.html', indexTemplate({tutorials, tutorialsByTag}, templateOptions));
