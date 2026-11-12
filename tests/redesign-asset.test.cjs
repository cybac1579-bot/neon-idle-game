'use strict';
// Binary assets must be verified as bytes, not decoded through UTF-8 GitHub file readers.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('site/index.html','utf8');
const src=html.match(/<img id="heroImage"[^>]*src="([^"]+)"/)?.[1];
assert.ok(src,'heroImage must have a source');
assert.ok(!src.includes('..')&&!src.startsWith('/'),'hero art must be local');
const file='site/'+src;
const bytes=fs.readFileSync(file);
assert.ok(bytes.length>100,'hero art file must not be empty');
if(src.endsWith('.webp')){
  assert.equal(bytes.toString('ascii',0,4),'RIFF','WebP RIFF signature');
  assert.equal(bytes.toString('ascii',8,12),'WEBP','WebP container signature');
}else if(src.endsWith('.svg')){
  assert.match(bytes.toString('utf8'),/<svg\\b/,'SVG signature');
}else throw new Error('Unsupported hero art format: '+src);
console.log('PASS binary hero asset',src,bytes.length+' bytes');
