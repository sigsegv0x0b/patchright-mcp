'use strict';

const QWERTY = {
  '`': [0, 0], '1': [0, 1], '2': [0, 2], '3': [0, 3], '4': [0, 4], '5': [0, 5],
  '6': [0, 6], '7': [0, 7], '8': [0, 8], '9': [0, 9], '0': [0, 10], '-': [0, 11], '=': [0, 12],
  'q': [1, 1], 'w': [1, 2], 'e': [1, 3], 'r': [1, 4], 't': [1, 5], 'y': [1, 6],
  'u': [1, 7], 'i': [1, 8], 'o': [1, 9], 'p': [1, 10], '[': [1, 11], ']': [1, 12], '\\': [1, 13],
  'a': [2, 1], 's': [2, 2], 'd': [2, 3], 'f': [2, 4], 'g': [2, 5], 'h': [2, 6],
  'j': [2, 7], 'k': [2, 8], 'l': [2, 9], ';': [2, 10], "'": [2, 11],
  'z': [3, 1], 'x': [3, 2], 'c': [3, 3], 'v': [3, 4], 'b': [3, 5], 'n': [3, 6],
  'm': [3, 7], ',': [3, 8], '.': [3, 9], '/': [3, 10],
  ' ': [4, 6]
};

const QWERTY_NEIGHBORS = {
  'q': ['w', 'a'],
  'w': ['q', 'e', 's', 'a'],
  'e': ['w', 'r', 'd', 's'],
  'r': ['e', 't', 'f', 'd'],
  't': ['r', 'y', 'g', 'f'],
  'y': ['t', 'u', 'h', 'g'],
  'u': ['y', 'i', 'j', 'h'],
  'i': ['u', 'o', 'k', 'j'],
  'o': ['i', 'p', 'l', 'k'],
  'p': ['o', '[', 'l'],
  'a': ['q', 's', 'z'],
  's': ['a', 'w', 'd', 'x', 'z'],
  'd': ['s', 'e', 'f', 'c', 'x'],
  'f': ['d', 'r', 'g', 'v', 'c'],
  'g': ['f', 't', 'h', 'b', 'v'],
  'h': ['g', 'y', 'j', 'n', 'b'],
  'j': ['h', 'u', 'k', 'm', 'n'],
  'k': ['j', 'i', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'z': ['a', 'x'],
  'x': ['z', 's', 'c'],
  'c': ['x', 'd', 'v'],
  'v': ['c', 'f', 'b'],
  'b': ['v', 'g', 'n'],
  'n': ['b', 'h', 'm'],
  'm': ['n', 'j', 'k'],
};

function qwertyDistance(char1, char2) {
  const k1 = QWERTY[char1.toLowerCase()];
  const k2 = QWERTY[char2.toLowerCase()];
  if (!k1 || !k2) return 5;
  return Math.sqrt((k1[0] - k2[0]) ** 2 + (k1[1] - k2[1]) ** 2);
}

function delayForDistance(dist) {
  if (dist <= 0.5) return 15;
  if (dist <= 1.5) return 30;
  if (dist <= 2.5) return 55;
  if (dist <= 3.5) return 80;
  if (dist <= 5) return 105;
  return 130;
}

function gaussianRandom(mean, stddev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stddev;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getQwertyNeighbor(char) {
  const lower = char.toLowerCase();
  const neighbors = QWERTY_NEIGHBORS[lower];
  if (!neighbors || neighbors.length === 0) return null;
  const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
  return char === lower ? neighbor : neighbor.toUpperCase();
}

function computeHumanDelays(text, options = {}) {
  const wpm = options.wpm || 60;
  const meanDelay = 12000 / wpm;
  const stddev = meanDelay * 0.3;

  const delays = [];
  let wordStart = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    let delay = gaussianRandom(meanDelay, stddev);

    if (i > 0) {
      const dist = qwertyDistance(text[i - 1], char);
      delay += delayForDistance(dist);
    } else {
      delay += 200;
    }

    if (char === ' ') {
      delay += gaussianRandom(120, 30);
    } else if (char === ',' || char === ';' || char === ':') {
      delay += gaussianRandom(150, 40);
    } else if (char === '.' || char === '!' || char === '?') {
      delay += gaussianRandom(400, 100);
    } else if (char === '\n') {
      delay += gaussianRandom(600, 150);
    }

    if (i > 0 && text[i - 1] === ' ') {
      wordStart = i;
    } else if (i - wordStart >= 1 && i - wordStart <= 3) {
      delay *= 0.85;
    }

    if (i > 80 && Math.random() < 0.015) {
      delay += gaussianRandom(700, 200);
    }

    if (i > 200) {
      const fatigue = (i - 200) / 800;
      delay *= 1 + fatigue * 0.4;
    }

    delays.push(clamp(Math.round(delay), 30, 1200));
  }

  return delays;
}

async function humanType(locator, text, options = {}) {
  const { wpm = 60, enableErrors = false } = options;
  const page = locator.page();
  const delays = computeHumanDelays(text, { wpm });

  await locator.focus();

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    await page.keyboard.press(char);
    await page.waitForTimeout(delays[i]);

    if (enableErrors && i > 2 && i < text.length - 1 && Math.random() < 0.03) {
      const typoKey = getQwertyNeighbor(char);
      if (typoKey && typoKey !== char) {
        await page.keyboard.press(typoKey);
        await page.waitForTimeout(gaussianRandom(180, 40));
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(gaussianRandom(120, 30));
        await page.keyboard.press(char);
        await page.waitForTimeout(delays[i]);
      }
    }
  }
}

module.exports = { humanType, computeHumanDelays, qwertyDistance, gaussianRandom };
