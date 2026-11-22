import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

// The graphs of examples/graphs.html: every file is whole, says where it comes from, and is in
// the page's list.
const dir = new URL('../examples/data/', import.meta.url);
const files = readdirSync(dir).filter(name => name.endsWith('.json')).sort();
const page = readFileSync(new URL('../examples/graphs.html', import.meta.url), 'utf8');

test('the page lists every data file, and only those', () => {
  let list = page.slice(page.indexOf('const GRAPHS = {'), page.indexOf('};', page.indexOf('const GRAPHS = {')));
  let listed = [...list.matchAll(/^\s*'([\w-]+)':/gm)].map(match => match[1] + '.json').sort();
  assert.deepEqual(listed, files);
});

for (let name of files) {
  test(`${name} is a whole graph with its source and license`, () => {
    let file = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
    for (let key of ['title', 'about', 'source', 'license']) {
      assert.ok(typeof file[key] === 'string' && file[key].length > 0, key);
    }
    assert.ok(Array.isArray(file.fields) && file.fields.includes('label'), 'nodes have labels');
    assert.ok(file.nodes.length > 0);
    assert.ok(file.nodes.every(row => Array.isArray(row) && row.length <= file.fields.length), 'rows fit the fields');
    assert.equal(file.links.length % 2, 0);
    assert.ok(file.links.every(i => Number.isInteger(i) && i >= 0 && i < file.nodes.length), 'links point at nodes');
    if (file.colorBy) assert.ok(file.fields.includes(file.colorBy), 'colorBy is a field');
    if (file.importance) assert.ok(file.fields.includes(file.importance), 'importance is a field');
    if (file.linkData) assert.equal(file.linkData.length, file.links.length / 2);
    let idAt = file.fields.indexOf('id');
    if (idAt >= 0) assert.equal(new Set(file.nodes.map(row => row[idAt])).size, file.nodes.length, 'ids are unique');
  });
}
