'use strict';
// Actual app functions, synthetic storage only; no browser or disk writes.
const assert = require('assert/strict');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '../app.js'), 'utf8');
const implementation = source.slice(source.indexOf('let legacyProgressStatus'), source.indexOf('function updateProgressDisplay'));
const key = 'seviatLearningProgress';
function memory(raw = null) {
  const values = new Map([['unrelated', 'preserve']]);
  if (raw !== null) values.set(key, raw);
  return {values, writes: 0, failRead: false, failWrite: false,
    getItem(k) { if (this.failRead) throw Error('SecurityError'); return values.get(k) ?? null; },
    setItem(k, v) { this.writes++; if (this.failWrite) throw Error('QuotaExceededError'); values.set(k, v); }
  };
}
function tab(storage) {
  const context = vm.createContext({localStorage: storage, console: {warn() {}}, updates: 0});
  vm.runInContext('const STORAGE_KEY="seviatLearningProgress"; let score=0,answeredQuestions=[]; function updateProgressDisplay(){updates++;}\n' + implementation +
    '\nglobalThis.api={load:loadProgress,save:saveProgress,state:()=>({score,answeredQuestions:[...answeredQuestions]}),answer(id){answeredQuestions.push(id);score+=10;},invalid(){score=NaN;}};', context);
  return context.api;
}
let cases = 0;
{
  const context = vm.createContext({console: {warn() {}}});
  Object.defineProperty(context, 'localStorage', {get() {throw Error('SecurityError');}});
  vm.runInContext('const STORAGE_KEY="seviatLearningProgress"; let score=0,answeredQuestions=[]; function updateProgressDisplay(){}\n' + implementation +
    '\nglobalThis.result=[loadProgress(),saveProgress()];', context);
  assert.deepEqual(Array.from(context.result), [false, false]); cases++;
}
for (const raw of ['{', '', ' \n', 'null', '[]', 'false', '42', '"text"',
  '{"score":-1}', '{"score":""}', '{"score":" "}', '{"score":"NaN"}', '{"score":"-10"}', '{"score":"0x10"}', '{"score":null}', '{"score":1e400}',
  '{"answeredQuestions":null}', '{"answeredQuestions":{}}', '{"answeredQuestions":[1]}',
  '{"answeredQuestions":[""]}', '{"updatedAt":null}', '{"updatedAt":"invalid"}']) {
  const store = memory(raw), app = tab(store);
  assert.equal(app.load(), false);
  app.answer('synthetic');
  assert.equal(app.save(), false);
  assert.equal(app.load(), false, 'blocked context must not silently reset');
  assert.equal(store.values.get(key), raw, 'exact original string preserved');
  assert.equal(store.writes, 0);
  assert.equal(store.values.get('unrelated'), 'preserve');
  cases++;
}
for (const initial of [null, '{}', '{"score":0,"custom":"keep"}', '{"score":"10"}', '{"score":" 12.5 "}', '{"score":"1e2"}',
  ' { "score":31, "answeredQuestions":["retired","retired"], "updatedAt":"2026-11-01T00:00:00.000Z", "custom":{"keep":true} } ']) {
  const store = memory(initial), app = tab(store);
  assert.equal(app.save(), false, 'no write before successful load');
  assert.equal(app.load(), true);
  assert.equal(store.values.get(key) ?? null, initial, 'loading never normalizes bytes');
  const before = JSON.parse(JSON.stringify(app.state()));
  app.answer('synthetic');
  assert.equal(app.save(), true);
  const saved = JSON.parse(store.values.get(key));
  assert.equal(saved.score, before.score + 10);
  assert.deepEqual(saved.answeredQuestions, [...before.answeredQuestions, 'synthetic']);
  if (initial && Object.hasOwn(JSON.parse(initial), 'custom')) assert.deepEqual(saved.custom, JSON.parse(initial).custom);
  const reloaded = tab(store); assert.equal(reloaded.load(), true);
  assert.equal(reloaded.state().score, saved.score);
  reloaded.answer('second'); assert.equal(reloaded.save(), true);
  assert.equal(store.values.get('unrelated'), 'preserve'); cases++;
}
{
  const store = memory(' {"score":10} '), app = tab(store);
  store.failRead = true; assert.equal(app.load(), false);
  store.failRead = false; app.answer('x'); assert.equal(app.save(), false);
  assert.equal(store.values.get(key), ' {"score":10} '); assert.equal(store.writes, 0); cases++;
}
{
  // Access to window.localStorage itself can throw, before getItem is reached.
  const store = memory('{"score":10}');
  Object.defineProperty(store, 'getItem', {get() {throw Error('SecurityError');}});
  const app = tab(store); assert.equal(app.load(), false); assert.equal(app.save(), false);
  assert.equal(store.values.get(key), '{"score":10}'); cases++;
}
{
  const store = memory('{"score":10}'), app = tab(store); app.load(); app.answer('x');
  store.failRead = true; assert.equal(app.save(), false);
  store.failRead = false; assert.equal(app.save(), false);
  assert.equal(store.values.get(key), '{"score":10}'); assert.equal(store.writes, 0); cases++;
}
{
  const original = ' {"score":10,"custom":"keep"} ', store = memory(original), app = tab(store);
  app.load(); app.answer('x'); store.failWrite = true;
  assert.equal(app.save(), false); assert.equal(store.values.get(key), original);
  assert.equal(tab(store).load(), true, 'reload still reads original after failed write');
  store.failWrite = false; assert.equal(app.save(), true, 'retry retains original comparison baseline');
  assert.equal(JSON.parse(store.values.get(key)).score, 20); cases++;
}
{
  const store = memory('{"score":10}'), app = tab(store); app.load(); app.invalid();
  assert.equal(app.save(), false); assert.equal(store.writes, 0); cases++;
}
{
  const store = memory('{"score":10}'), a = tab(store), b = tab(store); a.load(); b.load();
  a.answer('a'); store.failWrite = true; assert.equal(a.save(), false);
  store.failWrite = false; b.answer('b'); assert.equal(b.save(), true);
  const newer = store.values.get(key);
  assert.equal(a.save(), false, 'quota retry must still reject a competing write');
  assert.equal(store.values.get(key), newer); cases++;
}
for (const replacement of ['{"score":90}', ' {"score":10} ', '{', null]) {
  const store = memory('{"score":10}'), a = tab(store), b = tab(store); a.load(); b.load();
  if (replacement === null) store.values.delete(key); else store.values.set(key, replacement);
  a.answer('a'); assert.equal(a.save(), false); b.answer('b'); assert.equal(b.save(), false);
  assert.equal(store.values.get(key) ?? null, replacement); assert.equal(store.writes, 0); cases++;
}
{
  const store = memory(), a = tab(store), b = tab(store); a.load(); b.load();
  a.answer('a'); assert.equal(a.save(), true); const newer = store.values.get(key);
  b.answer('b'); assert.equal(b.save(), false); assert.equal(store.values.get(key), newer);
  const reloaded = tab(store); reloaded.load(); reloaded.answer('b'); assert.equal(reloaded.save(), true);
  assert.deepEqual(JSON.parse(store.values.get(key)).answeredQuestions, ['a', 'b']); cases++;
}
{
  // Documented boundary: localStorage cannot atomically compare then set.
  // Model an external write occurring after the comparison read has returned.
  const store = memory('{"score":10}'), app = tab(store); app.load(); app.answer('a');
  const get = store.getItem.bind(store);
  store.getItem = k => {const old = get(k); store.values.set(key, '{"score":90}'); return old;};
  assert.equal(app.save(), true);
  assert.equal(JSON.parse(store.values.get(key)).score, 20, 'known non-atomic race, not a concurrency guarantee'); cases++;
}
console.log(JSON.stringify({passed:true,cases,scope:'real legacy functions; corrupt bytes, schema, read/write errors, quota retry, reload, unknown fields, stale tabs; non-atomic race explicitly demonstrated; synthetic data only'}));
