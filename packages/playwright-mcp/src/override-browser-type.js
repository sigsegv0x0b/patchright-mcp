'use strict';

const path = require('path');
const mcpBundle = require('patchright-core/lib/mcpBundle');
const { humanType } = require('./human-typing');

const envMode = process.env.BROWSER_TYPE_HUMAN || '';

require('patchright/lib/mcp/browser/tools');

const toolsPath = require.resolve('patchright/lib/mcp/browser/tools');
const keyboardPath = path.join(path.dirname(toolsPath), 'tools', 'keyboard.js');
const kbModule = require.cache[keyboardPath];
if (!kbModule) return;

const toolsArr = kbModule.exports && (kbModule.exports.default || kbModule.exports);
if (!Array.isArray(toolsArr)) return;

const typeTool = toolsArr.find(t => t.schema && t.schema.name === 'browser_type');
if (!typeTool) return;

const originalHandle = typeTool.handle;

if (envMode !== 'forced' && envMode !== 'disabled') {
  typeTool.schema.inputSchema = typeTool.schema.inputSchema.extend({
    human: mcpBundle.z.boolean().optional().describe(
      'Type with human-like delays (QWERTY distance, boundary pauses, Gaussian variance).'
    )
  });
}

typeTool.handle = async (context, params, response) => {
  let useHuman;

  if (envMode === 'forced') {
    useHuman = true;
  } else if (envMode === 'disabled') {
    useHuman = false;
  } else {
    useHuman = params.human === true;
  }

  if (!useHuman) {
    delete params.human;
    return originalHandle(context, params, response);
  }

  const tab = await context.ensureTab();
  const { locator } = await tab.refLocator(params);
  const secret = tab.context.lookupSecret(params.text);
  const enableErrors = params.enable_errors === true;

  await tab.waitForCompletion(async () => {
    response.setIncludeSnapshot();
    response.addCode(`// Human-like typing: ${secret.code}`);

    await humanType(locator, secret.value, {
      wpm: 60,
      enableErrors
    });

    if (params.submit) {
      response.addCode(`await page.${secret.code}.press('Enter');`);
      await locator.press('Enter');
    }
  });
};
