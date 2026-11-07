/** Isolated, muted, keyboard-only check of the complete Stand By Me study.
 * Usage: npm run dev:study; node scripts/study-browser-test.mjs
 * Never attaches to the user's Chrome profile or opens a MIDI device.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const url = process.argv[2] ?? 'http://127.0.0.1:5175/';
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'dk-study-chrome-'));
const browser = spawn(chromePath, [
  '--headless=new', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,900',
  '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
try {
  let port;
  for (let i = 0; i < 60 && !port; i++) {
    try { port = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { await sleep(200); }
  }
  assert(port, 'isolated Chrome started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    const timer = setTimeout(() => { pending.delete(n); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(n, (msg) => { clearTimeout(timer); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? 'Browser evaluation failed');
    return res.result.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => {
      throw new DOMException('MIDI intentionally disabled in isolated test', 'SecurityError');
    } });
  ` });
  await send('Page.navigate', { url: `${url.replace(/\/$/, '')}/#songs-practice` });
  for (let i = 0; i < 60; i++) {
    if (await evaluate(`!!document.querySelector('.songcard')`)) break;
    await sleep(100);
  }
  const title = 'Stand By Me - Segunda parte (estudo com clique)';
  assert(await evaluate(`document.body.textContent.includes(${JSON.stringify(title)})`), 'study appears in library');
  assert.equal(await evaluate('window.dk.booted'), false, 'opening the library does not start audio or MIDI');
  await evaluate(`Array.from(document.querySelectorAll('.songcard')).find((c) => c.textContent.includes(${JSON.stringify(title)})).click()`);
  await evaluate(`document.querySelector('.diff[data-d="expert"]').click()`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === 'TOCAR').click()`);
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.dkSession')) break;
    await sleep(100);
  }
  assert.equal(await evaluate('dkSession.judge.notes.length'), 318);
  await evaluate(`(() => {
    const s = dkSession;
    const keys = { kick:'Space', snare:'KeyF', hihatClosed:'KeyD', hihatOpen:'KeyS', ride:'KeyL' };
    let i = 0;
    window.studyTestDone = false;
    function tick() {
      const t = s.chartTime;
      while (i < s.judge.notes.length && s.judge.notes[i].time <= t + 0.004) {
        const n = s.judge.notes[i++];
        window.dispatchEvent(new KeyboardEvent('keydown', { code: keys[n.voice], bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: keys[n.voice], bubbles: true }));
      }
      if (i === s.judge.notes.length && t > s.judge.notes.at(-1).time + 0.3) {
        s.pause(); window.studyTestDone = true; return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })()`);
  console.log('Study loaded: 318 notes. Checking all 25 bars in muted, isolated Chrome.');
  await fs.mkdir('.e2e', { recursive: true });
  let captured = false;
  for (let i = 0; i < 700; i++) {
    if (!captured && await evaluate('dkSession.chartTime > 35')) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await fs.writeFile('.e2e/stand-by-me-highway.png', Buffer.from(shot.result.data, 'base64'));
      captured = true;
    }
    if (await evaluate('window.studyTestDone')) break;
    await sleep(100);
  }
  assert(await evaluate('window.studyTestDone'), 'all notes played');
  const result = await evaluate(`({ notes: dkSession.judge.notes.length, hits: dkSession.judge.hits,
    combo: dkSession.judge.maxCombo, accuracy: dkSession.judge.accuracy,
    errors: dkSession.judge.overhits, midiConnected: dk.input.midi.ready })`);
  assert.equal(result.combo, 318, JSON.stringify(result));
  assert.equal(result.hits.miss, 0, JSON.stringify(result));
  assert(result.accuracy > 0.99, JSON.stringify(result));
  assert.equal(result.errors, 0);
  assert.equal(result.midiConnected, false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result, null, 2));
  await fs.writeFile('.e2e/stand-by-me-result.json', JSON.stringify(result, null, 2) + '\n');
} finally {
  ws?.close();
  browser.kill();
  await new Promise((resolve) => browser.exitCode !== null || browser.signalCode !== null ? resolve() : browser.once('exit', resolve));
  await fs.rm(profile, { recursive: true, force: true });
}
