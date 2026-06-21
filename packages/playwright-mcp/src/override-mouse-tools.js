'use strict';

const path = require('path');
const mcpBundle = require('patchright-core/lib/mcpBundle');
const { humanMouseMove, humanMouseClick, humanMouseDoubleClick, humanMouseDrag } = require('./human-mouse');

const envMode = process.env.MOUSE_HUMAN_MODE || '';

require('patchright/lib/mcp/browser/tools');

const toolsPath = require.resolve('patchright/lib/mcp/browser/tools');
const toolsDir = path.dirname(toolsPath);
const mousePath = path.join(toolsDir, 'tools', 'mouse.js');
const snapshotPath = path.join(toolsDir, 'tools', 'snapshot.js');

function shouldUseHuman(params) {
  if (envMode === 'forced') return true;
  if (envMode === 'disabled') return false;
  return params.human === true;
}

function addHumanToSchema(schema) {
  if (envMode === 'forced' || envMode === 'disabled') return schema;
  return schema.extend({
    human: mcpBundle.z.boolean().optional().describe(
      'Use human-like mouse movement (bezier curves, Gaussian delays, micro-jitter).'
    )
  });
}

const mouseMod = require.cache[mousePath];
if (mouseMod) {
  const mouseArr = mouseMod.exports && (mouseMod.exports.default || mouseMod.exports);
  if (Array.isArray(mouseArr)) {
    const moveTool = mouseArr.find(t => t.schema?.name === 'browser_mouse_move_xy');
    if (moveTool) {
      const origHandle = moveTool.handle;
      moveTool.schema.inputSchema = addHumanToSchema(moveTool.schema.inputSchema);
      moveTool.handle = async (context, params, response) => {
        if (!shouldUseHuman(params)) {
          delete params.human;
          return origHandle(context, params, response);
        }
        const tab = await context.ensureTab();
        response.addCode(`// Human mouse move to (${params.x}, ${params.y})`);
        response.addCode(`await page.mouse.move(${params.x}, ${params.y});`);
        await tab.waitForCompletion(async () => {
          await humanMouseMove(tab.page, params.x, params.y);
        });
      };
    }

    const clickTool = mouseArr.find(t => t.schema?.name === 'browser_mouse_click_xy');
    if (clickTool) {
      const origHandle = clickTool.handle;
      clickTool.schema.inputSchema = addHumanToSchema(clickTool.schema.inputSchema);
      clickTool.handle = async (context, params, response) => {
        if (!shouldUseHuman(params)) {
          delete params.human;
          return origHandle(context, params, response);
        }
        const tab = await context.ensureTab();
        response.setIncludeSnapshot();
        response.addCode(`// Human click at (${params.x}, ${params.y})`);
        response.addCode(`await page.mouse.move(${params.x}, ${params.y});`);
        response.addCode(`await page.mouse.down();`);
        response.addCode(`await page.mouse.up();`);
        await tab.waitForCompletion(async () => {
          await humanMouseClick(tab.page, params.x, params.y);
        });
      };
    }

    const dragTool = mouseArr.find(t => t.schema?.name === 'browser_mouse_drag_xy');
    if (dragTool) {
      const origHandle = dragTool.handle;
      dragTool.schema.inputSchema = addHumanToSchema(dragTool.schema.inputSchema);
      dragTool.handle = async (context, params, response) => {
        if (!shouldUseHuman(params)) {
          delete params.human;
          return origHandle(context, params, response);
        }
        const tab = await context.ensureTab();
        response.setIncludeSnapshot();
        response.addCode(`// Human drag from (${params.startX}, ${params.startY}) to (${params.endX}, ${params.endY})`);
        response.addCode(`await page.mouse.move(${params.startX}, ${params.startY});`);
        response.addCode(`await page.mouse.down();`);
        response.addCode(`await page.mouse.move(${params.endX}, ${params.endY});`);
        response.addCode(`await page.mouse.up();`);
        await tab.waitForCompletion(async () => {
          await humanMouseDrag(tab.page, params.startX, params.startY, params.endX, params.endY);
        });
      };
    }
  }
}

const snapMod = require.cache[snapshotPath];
if (snapMod) {
  const snapArr = snapMod.exports && (snapMod.exports.default || snapMod.exports);
  if (Array.isArray(snapArr)) {
    const clickTool = snapArr.find(t => t.schema?.name === 'browser_click');
    if (clickTool) {
      const origHandle = clickTool.handle;
      clickTool.schema.inputSchema = addHumanToSchema(clickTool.schema.inputSchema);
      clickTool.handle = async (context, params, response) => {
        if (!shouldUseHuman(params)) {
          delete params.human;
          return origHandle(context, params, response);
        }
        const tab = await context.ensureTab();
        const { locator, resolved } = await tab.refLocator(params);
        response.setIncludeSnapshot();
        response.addCode(`// Human click on ${resolved}`);
        await tab.waitForCompletion(async () => {
          const box = await locator.boundingBox();
          if (!box || box.width === 0 || box.height === 0) {
            response.addCode(`// No bounding box, falling back to locator.click`);
            const opts = { force: true, button: params.button };
            if (params.modifiers) opts.modifiers = params.modifiers;
            if (params.doubleClick) await locator.dblclick(opts);
            else await locator.click(opts);
            return;
          }
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          if (params.doubleClick)
            await humanMouseDoubleClick(tab.page, cx, cy, { button: params.button });
          else
            await humanMouseClick(tab.page, cx, cy, { button: params.button });
        });
      };
    }

    const hoverTool = snapArr.find(t => t.schema?.name === 'browser_hover');
    if (hoverTool) {
      const origHandle = hoverTool.handle;
      hoverTool.schema.inputSchema = addHumanToSchema(hoverTool.schema.inputSchema);
      hoverTool.handle = async (context, params, response) => {
        if (!shouldUseHuman(params)) {
          delete params.human;
          return origHandle(context, params, response);
        }
        const tab = await context.ensureTab();
        const { locator, resolved } = await tab.refLocator(params);
        response.setIncludeSnapshot();
        response.addCode(`// Human hover on ${resolved}`);
        await tab.waitForCompletion(async () => {
          const box = await locator.boundingBox();
          if (!box || box.width === 0 || box.height === 0) {
            response.addCode(`// No bounding box, falling back to locator.hover`);
            await locator.hover();
            return;
          }
          await humanMouseMove(tab.page, box.x + box.width / 2, box.y + box.height / 2);
        });
      };
    }
  }
}
