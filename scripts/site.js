// Puts together what GitHub Pages serves: `npm run build && npm run site` writes site/.
//
//   site/index.html   sends the visitor to examples/
//   site/examples/    the examples, as they are in the repository
//   site/dist/        the build the examples load (../dist/vivagraph.min.js)
//
// The folders keep their places, so the pages are the same files that open from a checkout.
import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = root + 'site/';

if (!existsSync(root + 'dist/vivagraph.min.js')) {
  console.error('No build in dist/. Run `npm run build` first.');
  process.exit(1);
}

rmSync(site, {recursive: true, force: true});
mkdirSync(site);
cpSync(root + 'examples', site + 'examples', {recursive: true});
cpSync(root + 'dist', site + 'dist', {recursive: true});
writeFileSync(site + 'index.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=examples/">
<title>VivaGraph</title>
<link rel="icon" href="data:,">
</head>
<body>
<p><a href="examples/">VivaGraph examples</a></p>
</body>
</html>
`);
// GitHub Pages serves the files as they are
writeFileSync(site + '.nojekyll', '');
console.log('site/ is ready');
