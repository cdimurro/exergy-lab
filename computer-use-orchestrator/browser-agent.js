/**
 * Claude Computer Use Browser Agent
 *
 * Uses Puppeteer to control Chrome and Claude's Computer Use API
 * for autonomous browser automation tasks.
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  displayWidth: 1280,
  displayHeight: 800,
  maxIterations: 30,
  screenshotDir: './screenshots',
  betaFlag: 'computer-use-2025-01-24',
};

// Ensure screenshots directory exists
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

/**
 * Browser Controller - handles all Puppeteer interactions
 */
class BrowserController {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotCount = 0;
  }

  async launch() {
    console.log('[Browser] Launching Chrome...');
    this.browser = await puppeteer.launch({
      headless: false, // Show the browser
      defaultViewport: {
        width: CONFIG.displayWidth,
        height: CONFIG.displayHeight,
      },
      args: [
        `--window-size=${CONFIG.displayWidth},${CONFIG.displayHeight}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width: CONFIG.displayWidth,
      height: CONFIG.displayHeight,
    });

    console.log('[Browser] Chrome launched successfully');
    return this.page;
  }

  async screenshot() {
    this.screenshotCount++;
    const filename = path.join(CONFIG.screenshotDir, `screenshot_${this.screenshotCount}.png`);

    await this.page.screenshot({
      path: filename,
      type: 'png',
    });

    // Read as base64
    const imageBuffer = fs.readFileSync(filename);
    const base64Image = imageBuffer.toString('base64');

    console.log(`[Browser] Screenshot captured: ${filename}`);
    return base64Image;
  }

  async click(x, y) {
    console.log(`[Browser] Clicking at (${x}, ${y})`);
    await this.page.mouse.click(x, y);
    await this.wait(300); // Small delay for UI to update
  }

  async doubleClick(x, y) {
    console.log(`[Browser] Double-clicking at (${x}, ${y})`);
    await this.page.mouse.click(x, y, { clickCount: 2 });
    await this.wait(300);
  }

  async rightClick(x, y) {
    console.log(`[Browser] Right-clicking at (${x}, ${y})`);
    await this.page.mouse.click(x, y, { button: 'right' });
    await this.wait(300);
  }

  async type(text) {
    console.log(`[Browser] Typing: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    await this.page.keyboard.type(text, { delay: 50 });
  }

  async key(keyCombo) {
    console.log(`[Browser] Pressing key: ${keyCombo}`);

    // Handle key combinations like "ctrl+a", "cmd+c", etc.
    const keys = keyCombo.toLowerCase().split('+');

    const modifiers = [];
    let mainKey = null;

    for (const key of keys) {
      if (['ctrl', 'control'].includes(key)) {
        modifiers.push('Control');
      } else if (['cmd', 'command', 'meta'].includes(key)) {
        modifiers.push('Meta');
      } else if (['alt', 'option'].includes(key)) {
        modifiers.push('Alt');
      } else if (['shift'].includes(key)) {
        modifiers.push('Shift');
      } else {
        mainKey = this.mapKey(key);
      }
    }

    // Press modifiers
    for (const mod of modifiers) {
      await this.page.keyboard.down(mod);
    }

    // Press main key
    if (mainKey) {
      await this.page.keyboard.press(mainKey);
    }

    // Release modifiers
    for (const mod of modifiers.reverse()) {
      await this.page.keyboard.up(mod);
    }

    await this.wait(200);
  }

  mapKey(key) {
    const keyMap = {
      'return': 'Enter',
      'enter': 'Enter',
      'tab': 'Tab',
      'escape': 'Escape',
      'esc': 'Escape',
      'backspace': 'Backspace',
      'delete': 'Delete',
      'up': 'ArrowUp',
      'down': 'ArrowDown',
      'left': 'ArrowLeft',
      'right': 'ArrowRight',
      'home': 'Home',
      'end': 'End',
      'pageup': 'PageUp',
      'pagedown': 'PageDown',
      'space': 'Space',
    };
    return keyMap[key.toLowerCase()] || key;
  }

  async mouseMove(x, y) {
    console.log(`[Browser] Moving mouse to (${x}, ${y})`);
    await this.page.mouse.move(x, y);
  }

  async scroll(x, y, direction, amount) {
    console.log(`[Browser] Scrolling ${direction} by ${amount} at (${x}, ${y})`);
    await this.page.mouse.move(x, y);

    const scrollAmount = amount * 100; // Convert to pixels

    if (direction === 'down') {
      await this.page.mouse.wheel({ deltaY: scrollAmount });
    } else if (direction === 'up') {
      await this.page.mouse.wheel({ deltaY: -scrollAmount });
    } else if (direction === 'right') {
      await this.page.mouse.wheel({ deltaX: scrollAmount });
    } else if (direction === 'left') {
      await this.page.mouse.wheel({ deltaX: -scrollAmount });
    }

    await this.wait(300);
  }

  async drag(startX, startY, endX, endY) {
    console.log(`[Browser] Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
    await this.wait(300);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async navigate(url) {
    console.log(`[Browser] Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('[Browser] Chrome closed');
    }
  }
}

/**
 * Claude Computer Use Agent
 */
class ComputerUseAgent {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
    this.browser = new BrowserController();
    this.messages = [];
  }

  async initialize() {
    await this.browser.launch();
  }

  /**
   * Execute a computer use action from Claude's response
   */
  async executeAction(action, input) {
    console.log(`\n[Agent] Executing action: ${action}`);

    try {
      switch (action) {
        case 'screenshot':
          return await this.browser.screenshot();

        case 'left_click':
          const [clickX, clickY] = input.coordinate;
          await this.browser.click(clickX, clickY);
          return 'Click performed successfully';

        case 'double_click':
          const [dblX, dblY] = input.coordinate;
          await this.browser.doubleClick(dblX, dblY);
          return 'Double click performed successfully';

        case 'right_click':
          const [rightX, rightY] = input.coordinate;
          await this.browser.rightClick(rightX, rightY);
          return 'Right click performed successfully';

        case 'type':
          await this.browser.type(input.text);
          return 'Text typed successfully';

        case 'key':
          await this.browser.key(input.key);
          return `Key "${input.key}" pressed successfully`;

        case 'mouse_move':
          const [moveX, moveY] = input.coordinate;
          await this.browser.mouseMove(moveX, moveY);
          return 'Mouse moved successfully';

        case 'scroll':
          const [scrollX, scrollY] = input.coordinate;
          await this.browser.scroll(
            scrollX,
            scrollY,
            input.scroll_direction,
            input.scroll_amount || 3
          );
          return `Scrolled ${input.scroll_direction} successfully`;

        case 'left_click_drag':
          const [startX, startY] = input.start_coordinate;
          const [endX, endY] = input.coordinate;
          await this.browser.drag(startX, startY, endX, endY);
          return 'Drag performed successfully';

        case 'wait':
          const waitTime = (input.duration || 1) * 1000;
          await this.browser.wait(waitTime);
          return `Waited ${input.duration || 1} seconds`;

        default:
          return `Unknown action: ${action}`;
      }
    } catch (error) {
      console.error(`[Agent] Action error: ${error.message}`);
      return `Error: ${error.message}`;
    }
  }

  /**
   * Process tool calls from Claude's response
   */
  async processToolCalls(response) {
    const toolResults = [];

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        console.log(`\n[Agent] Tool call: ${block.name}`);

        if (block.name === 'computer') {
          const action = block.input.action;
          const result = await this.executeAction(action, block.input);

          // For screenshots, return as image
          if (action === 'screenshot') {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: result,
                  },
                },
              ],
            });
          } else {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            });
          }
        } else if (block.name === 'bash') {
          // Handle bash commands if needed
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Bash tool not implemented in browser context',
          });
        }
      } else if (block.type === 'text') {
        console.log(`\n[Claude] ${block.text}`);
      }
    }

    return toolResults;
  }

  /**
   * Main agent loop
   */
  async run(task, startUrl = null) {
    console.log('\n' + '='.repeat(60));
    console.log(`[Agent] Starting task: ${task}`);
    console.log('='.repeat(60) + '\n');

    // Navigate to start URL if provided
    if (startUrl) {
      await this.browser.navigate(startUrl);
      await this.browser.wait(1000);
    }

    // Initial message with task
    this.messages = [
      {
        role: 'user',
        content: `${task}

IMPORTANT INSTRUCTIONS:
- Take a screenshot first to see the current state
- After each action, take a screenshot to verify the result
- Be methodical and verify each step before proceeding
- If you encounter a CAPTCHA or verification, let me know
- When filling forms, take your time and verify inputs`,
      },
    ];

    const tools = [
      {
        type: 'computer_20250124',
        name: 'computer',
        display_width_px: CONFIG.displayWidth,
        display_height_px: CONFIG.displayHeight,
      },
    ];

    let iteration = 0;

    while (iteration < CONFIG.maxIterations) {
      iteration++;
      console.log(`\n--- Iteration ${iteration}/${CONFIG.maxIterations} ---`);

      try {
        const response = await this.client.beta.messages.create({
          model: CONFIG.model,
          max_tokens: CONFIG.maxTokens,
          tools: tools,
          messages: this.messages,
          betas: [CONFIG.betaFlag],
        });

        // Add Claude's response to history
        this.messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Check stop reason
        if (response.stop_reason === 'end_turn') {
          console.log('\n[Agent] Task completed!');
          // Print final text response
          for (const block of response.content) {
            if (block.type === 'text') {
              console.log(`\n[Claude Final Response]\n${block.text}`);
            }
          }
          break;
        }

        // Process tool calls
        const toolResults = await this.processToolCalls(response);

        if (toolResults.length === 0) {
          console.log('[Agent] No tool calls, task may be complete');
          break;
        }

        // Add tool results to messages
        this.messages.push({
          role: 'user',
          content: toolResults,
        });

      } catch (error) {
        console.error(`[Agent] Error: ${error.message}`);
        if (error.message.includes('rate limit')) {
          console.log('[Agent] Rate limited, waiting 30 seconds...');
          await this.browser.wait(30000);
        } else {
          throw error;
        }
      }
    }

    if (iteration >= CONFIG.maxIterations) {
      console.log('[Agent] Max iterations reached');
    }
  }

  async close() {
    await this.browser.close();
  }
}

/**
 * Main entry point
 */
async function main() {
  // Get API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    console.log('\nUsage:');
    console.log('  export ANTHROPIC_API_KEY=your_key_here');
    console.log('  node browser-agent.js');
    process.exit(1);
  }

  // Get task from command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Computer Use Browser Agent');
    console.log('==========================\n');
    console.log('Usage: node browser-agent.js "<task>" [start_url]');
    console.log('\nExamples:');
    console.log('  node browser-agent.js "Search for cat pictures on Google"');
    console.log('  node browser-agent.js "Sign up for Semantic Scholar API" "https://www.semanticscholar.org/product/api"');
    console.log('  node browser-agent.js "Fill out the NREL developer signup form" "https://developer.nrel.gov/signup/"');
    process.exit(0);
  }

  const task = args[0];
  const startUrl = args[1] || 'https://www.google.com';

  const agent = new ComputerUseAgent(apiKey);

  try {
    await agent.initialize();
    await agent.run(task, startUrl);
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    // Keep browser open for a moment to see final state
    console.log('\n[Agent] Keeping browser open for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    await agent.close();
  }
}

main();
