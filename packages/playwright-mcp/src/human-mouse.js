'use strict';

const mousePositions = new WeakMap();

function getMousePosition(page) {
  return mousePositions.get(page) || null;
}

function setMousePosition(page, x, y) {
  mousePositions.set(page, { x, y });
}

function clearMousePosition(page) {
  mousePositions.delete(page);
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

function cubicBezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function generatePath(startX, startY, endX, endY) {
  const dist = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const numPoints = clamp(Math.round(dist / 3), 25, 80);

  const controlOffset = dist * 0.15 + 10;
  const cp1x = startX + (endX - startX) * 0.25 + gaussianRandom(0, controlOffset * 0.5);
  const cp1y = startY + (endY - startY) * 0.25 + gaussianRandom(0, controlOffset * 0.5);
  const cp2x = startX + (endX - startX) * 0.75 + gaussianRandom(0, controlOffset * 0.5);
  const cp2y = startY + (endY - startY) * 0.75 + gaussianRandom(0, controlOffset * 0.5);

  const points = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const x = cubicBezier(easedT, startX, cp1x, cp2x, endX);
    const y = cubicBezier(easedT, startY, cp1y, cp2y, endY);

    const jitter = Math.min(1.5, 0.5 + dist * 0.002);
    const jx = gaussianRandom(0, jitter);
    const jy = gaussianRandom(0, jitter);

    const progress = i / numPoints;
    const baseDelay = 5 + Math.sin(progress * Math.PI) * 10;

    points.push({ x: x + jx, y: y + jy, delay: baseDelay });
  }

  if (dist > 50 && Math.random() < 0.12) {
    const overshootPx = clamp(dist * 0.03, 3, 15);
    const angle = Math.atan2(endY - startY, endX - startX);
    const oosX = endX + Math.cos(angle) * overshootPx + gaussianRandom(0, 3);
    const oosY = endY + Math.sin(angle) * overshootPx + gaussianRandom(0, 3);
    const overshootPoints = [
      ...generatePath(endX, endY, oosX, oosY),
      ...generatePath(oosX, oosY, endX, endY)
    ];
    points.push(...overshootPoints);
  }

  return points;
}

async function humanMouseMove(page, endX, endY) {
  const start = getMousePosition(page);
  const fromX = start ? start.x : 0;
  const fromY = start ? start.y : 0;
  const path = generatePath(fromX, fromY, endX, endY);

  for (const pt of path) {
    await page.mouse.move(pt.x, pt.y);
    if (pt.delay > 0)
      await page.waitForTimeout(pt.delay);
  }

  setMousePosition(page, endX, endY);
}

async function humanMouseClick(page, x, y, options = {}) {
  await humanMouseMove(page, x, y);
  const dwell = gaussianRandom(130, 40);
  await page.waitForTimeout(clamp(dwell, 60, 280));
  await page.mouse.down({ button: options.button || 'left' });
  const hold = gaussianRandom(50, 20);
  await page.waitForTimeout(clamp(hold, 20, 120));
  await page.mouse.up({ button: options.button || 'left' });
  setMousePosition(page, x, y);
}

async function humanMouseDoubleClick(page, x, y, options = {}) {
  await humanMouseClick(page, x, y, options);
  const between = gaussianRandom(60, 20);
  await page.waitForTimeout(clamp(between, 30, 120));
  await page.mouse.down({ button: options.button || 'left' });
  const hold = gaussianRandom(50, 20);
  await page.waitForTimeout(clamp(hold, 20, 120));
  await page.mouse.up({ button: options.button || 'left' });
  setMousePosition(page, x, y);
}

async function humanMouseDrag(page, startX, startY, endX, endY) {
  await humanMouseMove(page, startX, startY);
  await page.mouse.down({ button: 'left' });
  setMousePosition(page, startX, startY);

  const dragPoints = generatePath(startX, startY, endX, endY);
  for (const pt of dragPoints) {
    await page.mouse.move(pt.x, pt.y);
    await page.waitForTimeout(pt.delay * 0.7);
  }

  await page.mouse.up({ button: 'left' });
  setMousePosition(page, endX, endY);
}

module.exports = {
  humanMouseMove,
  humanMouseClick,
  humanMouseDoubleClick,
  humanMouseDrag,
  generatePath,
  clearMousePosition
};
