const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'src/data/sampleTexts.js');

function randomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function wrapArray(arr) {
  return arr.map(text => ({ id: randomId(), text }));
}

function wrapSingle(text) {
  return { id: randomId(), text };
}

function processSource(src) {
  // Replace array exports
  src = src.replace(/export const (\w+) = \[(\s*`[\s\S]*?`\s*(?:,\s*`[\s\S]*?`\s*)*)];/g, (match, name, arrBody) => {
    // Split by backtick blocks
    const texts = arrBody.match(/`[\s\S]*?`/g) || [];
    const wrapped = wrapArray(texts.map(t => t.slice(1, -1)));
    const arrStr = wrapped.map(obj => `  { id: "${obj.id}", text: \`${obj.text.replace(/`/g, '\\`')}\` }`).join(',\n');
    console.log(`${name}: ${wrapped.length} IDs assigned.`);
    return `export const ${name} = [\n${arrStr}\n];`;
  });
  // Replace single string exports
  src = src.replace(/export const (\w+) = `([\s\S]*?)`;/g, (match, name, text) => {
    const obj = wrapSingle(text);
    console.log(`${name}: 1 ID assigned.`);
    return `export const ${name} = { id: "${obj.id}", text: \`${obj.text.replace(/`/g, '\\`')}\` };`;
  });
  return src;
}

const original = fs.readFileSync(FILE, 'utf8');
const updated = processSource(original);
fs.writeFileSync(FILE, updated, 'utf8');
console.log('sampleTexts.js updated with random IDs.'); 