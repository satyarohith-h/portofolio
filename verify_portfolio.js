const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;
const TARGET_URL = 'http://localhost:3000/';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.errors = [];
    
    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        const type = data.params.type;
        const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        if (type === 'error') this.errors.push(text);
        console.log(`[Browser Console ${type.toUpperCase()}]:`, text);
      } else if (data.method === 'Runtime.exceptionThrown') {
        const text = data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || '');
        this.errors.push(text);
        console.log(`[Browser Exception]:`, text);
      }
    };
  }

  async ready() {
    return new Promise(resolve => {
      if (this.ws.readyState === 1) return resolve();
      this.ws.onopen = resolve;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res.result?.value;
  }
}

async function run() {
  console.log('--- STARTING CHROMIUM AUTOMATED BROWSER VERIFICATION ---');
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const tabs = await getJson(`http://localhost:${PORT}/json`);
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) throw new Error('No page tab found in Chrome');

    const client = new CDPClient(pageTab.webSocketDebuggerUrl);
    await client.ready();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('DOM.enable');

    console.log(`Navigating to ${TARGET_URL}...`);
    await client.send('Page.navigate', { url: TARGET_URL });
    await sleep(2000);

    // 1. Initial State Checks
    console.log('\n--- 1. Testing Initial Page Load & Hero Assets ---');
    const title = await client.eval('document.title');
    console.log('Page Title:', title);

    const aboutImgLoaded = await client.eval(`
      (() => {
        const img = document.querySelector('.about-photo');
        return img ? { src: img.src, complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight } : null;
      })()
    `);
    console.log('About Me Corner Photo Status:', aboutImgLoaded);
    if (aboutImgLoaded && aboutImgLoaded.naturalWidth > 0) {
      console.log('SUCCESS: About Me portrait photo loaded properly with natural dimensions: ' + aboutImgLoaded.naturalWidth + 'x' + aboutImgLoaded.naturalHeight);
    } else {
      console.error('ERROR: About Me portrait photo failed to load or has 0 dimensions!');
    }

    const heroCanvasStatus = await client.eval(`
      (() => {
        const c = document.getElementById('hero-canvas');
        const fallback = document.getElementById('hero-fallback-img');
        const hud = document.getElementById('hud-frame-num');
        return {
          canvasExists: !!c,
          canvasWidth: c?.width,
          canvasHeight: c?.height,
          hudText: hud?.textContent?.trim(),
          fallbackExists: !!fallback,
          fallbackComplete: fallback?.complete
        };
      })()
    `);
    console.log('Hero Canvas & Fallback Status:', heroCanvasStatus);

    // 2. Slow and Fast Scroll Down
    console.log('\n--- 2. Testing Scroll Top-To-Bottom (Downward Scroll Animations) ---');
    const totalHeight = await client.eval('document.documentElement.scrollHeight');
    console.log('Total Scroll Height:', totalHeight);

    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      const targetY = Math.round((totalHeight / steps) * i);
      await client.eval(`window.scrollTo(0, ${targetY})`);
      await sleep(150);
    }

    await sleep(500);

    const revealedCount = await client.eval(`
      (() => {
        const total = document.querySelectorAll('.reveal-item').length;
        const revealed = document.querySelectorAll('.reveal-item.revealed').length;
        return { total, revealed, percent: Math.round((revealed/total)*100) };
      })()
    `);
    console.log(`Scroll Reveal Status at Bottom: ${revealedCount.revealed}/${revealedCount.total} (${revealedCount.percent}%) elements revealed`);

    // 3. Scroll Back Up
    console.log('\n--- 3. Testing Scroll Bottom-To-Top (Upward Scroll Handling) ---');
    for (let i = steps - 1; i >= 0; i--) {
      const targetY = Math.round((totalHeight / steps) * i);
      await client.eval(`window.scrollTo(0, ${targetY})`);
      await sleep(100);
    }
    await sleep(400);

    const topState = await client.eval(`
      (() => {
        return {
          scrollY: window.scrollY,
          activeNav: document.querySelector('.nav-link.active')?.getAttribute('href'),
          progressBar: document.getElementById('scroll-progress-bar')?.style?.width
        };
      })()
    `);
    console.log('Returned to Top State:', topState);

    // 4. Test Navigation Links
    console.log('\n--- 4. Testing Navigation Links Anchor Scrolling ---');
    const navTestResults = await client.eval(`
      (() => {
        const links = Array.from(document.querySelectorAll('.nav-link')).map(l => l.getAttribute('href'));
        const sectionsExist = links.map(href => {
          const target = document.querySelector(href);
          return { href, exists: !!target, offsetTop: target?.getBoundingClientRect()?.top };
        });
        return sectionsExist;
      })()
    `);
    console.log('Navigation Anchor Targets Test:', navTestResults);

    // 5. Mobile Viewport Test
    console.log('\n--- 5. Testing Mobile Viewport (390x844 iPhone Dimensions) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(400);

    const mobileCheck = await client.eval(`
      (() => {
        const toggle = document.getElementById('mobile-toggle');
        const drawer = document.getElementById('mobile-drawer');
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const hasHorizontalOverflow = scrollWidth > innerWidth;

        return {
          mobileToggleVisible: window.getComputedStyle(toggle).display !== 'none',
          drawerExists: !!drawer,
          scrollWidth,
          innerWidth,
          hasHorizontalOverflow
        };
      })()
    `);
    console.log('Mobile Layout Status:', mobileCheck);
    if (!mobileCheck.hasHorizontalOverflow) {
      console.log('SUCCESS: No horizontal overflow detected on mobile viewport!');
    } else {
      console.error('WARNING: Mobile has horizontal overflow: scrollWidth=' + mobileCheck.scrollWidth + ' vs innerWidth=' + mobileCheck.innerWidth);
    }

    // 6. Check Console Errors
    console.log('\n--- 6. Console Errors & Uncaught Exceptions Check ---');
    if (client.errors.length === 0) {
      console.log('PASSED: Zero console errors or uncaught exceptions detected!');
    } else {
      console.error('FAIL: Console errors found:', client.errors);
    }

  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    chromeProcess.kill();
    console.log('\n--- AUTOMATED VERIFICATION COMPLETE ---');
  }
}

run();
