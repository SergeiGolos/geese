#!/usr/bin/env node

/**
 * Configuration Hierarchy Integration Tests
 * Tests the 4-level configuration cascade: core → global → local → CLI
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk').default || require('chalk');
const ConfigManager = require('../../src/config-manager');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passCount = 0;
let failCount = 0;

const TEST_DIR = path.join(os.tmpdir(), 'geese-config-hierarchy-test');
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.geese');
const BACKUP_CONFIG_DIR = path.join(os.homedir(), '.geese-backup-hierarchy');

async function test(description, fn) {
  try {
    await fn();
    console.log(`${GREEN}✓${RESET} ${description}`);
    passCount++;
  } catch (error) {
    console.log(`${RED}✗${RESET} ${description}`);
    console.log(`  ${RED}${error.message}${RESET}`);
    failCount++;
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message || 'Assertion failed'}\n` +
      `  Expected: ${JSON.stringify(expected)}\n` +
      `  Actual: ${JSON.stringify(actual)}`
    );
  }
}

function setup() {
  // Backup existing config
  if (fs.existsSync(GLOBAL_CONFIG_DIR)) {
    if (fs.existsSync(BACKUP_CONFIG_DIR)) {
      fs.removeSync(BACKUP_CONFIG_DIR);
    }
    fs.copySync(GLOBAL_CONFIG_DIR, BACKUP_CONFIG_DIR);
    fs.removeSync(GLOBAL_CONFIG_DIR);
  }
  
  // Create test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.removeSync(TEST_DIR);
  }
  fs.ensureDirSync(TEST_DIR);
}

function cleanup() {
  // Clean up test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.removeSync(TEST_DIR);
  }
  
  // Restore original config
  if (fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.removeSync(GLOBAL_CONFIG_DIR);
  }
  if (fs.existsSync(BACKUP_CONFIG_DIR)) {
    fs.copySync(BACKUP_CONFIG_DIR, GLOBAL_CONFIG_DIR);
    fs.removeSync(BACKUP_CONFIG_DIR);
  }
}

console.log(chalk.bold('\n🧪 Running Configuration Hierarchy Integration Tests\n'));

setup();

(async () => {
try {
  // Test 1: Core defaults exist
  await test('Core defaults are defined', async () => {
    const configManager = new ConfigManager();
    const coreDefaults = configManager.getCoreDefaults();
    
    if (!coreDefaults || !coreDefaults.goose) {
      throw new Error('Core defaults not found');
    }
    
    assertEquals(coreDefaults.goose.model, 'gpt-4', 'Default model should be gpt-4');
    assertEquals(coreDefaults.defaultTool, 'goose', 'Default tool should be goose');
  });

  // Test 2: Global config overrides core defaults
  await test('Global config overrides core defaults', async () => {
    const configManager = new ConfigManager();
    
    // Create global config
    const globalConfig = {
      goose: {
        model: 'gpt-4-turbo',
        temperature: 0.9
      }
    };
    
    await configManager.saveConfig(globalConfig);
    
    const hierarchical = await configManager.loadHierarchicalConfig(TEST_DIR);
    
    assertEquals(hierarchical.config.goose.model, 'gpt-4-turbo', 'Global config should override core');
    assertEquals(hierarchical.config.goose.temperature, 0.9, 'Global temperature should be used');
    // Core default should still be present for unset values
    assertEquals(hierarchical.config.goose.max_tokens, 2000, 'Core default max_tokens should remain');
  });

  // Test 3: Local config overrides global config
  await test('Local config overrides global config', async () => {
    const configManager = new ConfigManager();
    
    // Create global config
    const globalConfig = {
      goose: {
        model: 'gpt-4-turbo',
        temperature: 0.9
      }
    };
    await configManager.saveConfig(globalConfig);
    
    // Create local config
    const localConfigDir = path.join(TEST_DIR, '.geese');
    fs.ensureDirSync(localConfigDir);
    const localConfigFile = path.join(localConfigDir, 'config.json');
    const localConfig = {
      goose: {
        temperature: 0.5,
        recipe: 'local-recipe'
      }
    };
    fs.writeFileSync(localConfigFile, JSON.stringify(localConfig, null, 2));
    
    const hierarchical = await configManager.loadHierarchicalConfig(TEST_DIR);
    
    assertEquals(hierarchical.config.goose.model, 'gpt-4-turbo', 'Global model should be inherited');
    assertEquals(hierarchical.config.goose.temperature, 0.5, 'Local temperature should override global');
    assertEquals(hierarchical.config.goose.recipe, 'local-recipe', 'Local recipe should be set');
  });

  // Test 4: .geese file config overrides local config
  await test('.geese file config overrides local config', async () => {
    const configManager = new ConfigManager();
    
    // Setup configs
    await configManager.saveConfig({ goose: { model: 'gpt-4-turbo' } });
    
    const localConfigDir = path.join(TEST_DIR, '.geese');
    fs.ensureDirSync(localConfigDir);
    fs.writeFileSync(
      path.join(localConfigDir, 'config.json'),
      JSON.stringify({ goose: { temperature: 0.5 } }, null, 2)
    );
    
    const geeseFileConfig = {
      recipe: 'geese-file-recipe',
      temperature: 0.3
    };
    
    const hierarchical = await configManager.loadHierarchicalConfig(TEST_DIR, geeseFileConfig);
    
    assertEquals(hierarchical.config.goose.temperature, 0.3, '.geese file temperature should override local');
    assertEquals(hierarchical.config.goose.recipe, 'geese-file-recipe', '.geese file recipe should be set');
  });

  // Test 5: CLI args override all configs
  await test('CLI args override all configs', async () => {
    const configManager = new ConfigManager();
    
    // Setup all config levels
    await configManager.saveConfig({ goose: { model: 'gpt-4-turbo', temperature: 0.9 } });
    
    const localConfigDir = path.join(TEST_DIR, '.geese');
    fs.ensureDirSync(localConfigDir);
    fs.writeFileSync(
      path.join(localConfigDir, 'config.json'),
      JSON.stringify({ goose: { temperature: 0.5 } }, null, 2)
    );
    
    const geeseFileConfig = { temperature: 0.3 };
    const cliArgs = { goose: { temperature: 0.1, model: 'gpt-3.5' } };
    
    const hierarchical = await configManager.loadHierarchicalConfig(TEST_DIR, geeseFileConfig, cliArgs);
    
    assertEquals(hierarchical.config.goose.temperature, 0.1, 'CLI temperature should override all');
    assertEquals(hierarchical.config.goose.model, 'gpt-3.5', 'CLI model should override all');
  });

  // Test 6: Hierarchy metadata is correct
  await test('Hierarchy metadata is tracked correctly', async () => {
    const configManager = new ConfigManager();
    
    const globalConfig = { goose: { model: 'gpt-4-turbo' } };
    await configManager.saveConfig(globalConfig);
    
    const hierarchical = await configManager.loadHierarchicalConfig(TEST_DIR);
    
    if (!hierarchical.hierarchy || !Array.isArray(hierarchical.hierarchy)) {
      throw new Error('Hierarchy metadata not found');
    }
    
    assertEquals(hierarchical.hierarchy.includes('core'), true, 'Should include core in hierarchy');
    assertEquals(hierarchical.hierarchy.includes('global'), true, 'Should include global in hierarchy');
    assertEquals(hierarchical.hierarchy.includes('cli'), true, 'Should include cli in hierarchy');
  });

  // Test 7: Deep merge works correctly
  await test('Deep merge merges nested objects', async () => {
    const configManager = new ConfigManager();
    
    const obj1 = {
      goose: {
        model: 'gpt-4',
        advanced: {
          option1: 'value1',
          option2: 'value2'
        }
      }
    };
    
    const obj2 = {
      goose: {
        temperature: 0.7,
        advanced: {
          option2: 'override',
          option3: 'value3'
        }
      }
    };
    
    const merged = configManager.deepMerge(obj1, obj2);
    
    assertEquals(merged.goose.model, 'gpt-4', 'model should be preserved');
    assertEquals(merged.goose.temperature, 0.7, 'temperature should be added');
    assertEquals(merged.goose.advanced.option1, 'value1', 'option1 should be preserved');
    assertEquals(merged.goose.advanced.option2, 'override', 'option2 should be overridden');
    assertEquals(merged.goose.advanced.option3, 'value3', 'option3 should be added');
  });

  // Test 8: Arrays are replaced, not merged
  await test('Arrays are replaced, not merged', async () => {
    const configManager = new ConfigManager();
    
    const obj1 = {
      goose: {
        include: ['file1.js', 'file2.js']
      }
    };
    
    const obj2 = {
      goose: {
        include: ['file3.js']
      }
    };
    
    const merged = configManager.deepMerge(obj1, obj2);
    
    assertEquals(merged.goose.include.length, 1, 'Array should be replaced, not merged');
    assertEquals(merged.goose.include[0], 'file3.js', 'New array should be used');
  });

  // Test 9: Configuration sources are tracked
  await test('Configuration sources are tracked', async () => {
    const configManager = new ConfigManager();
    
    const globalConfig = { goose: { model: 'gpt-4-turbo' } };
    await configManager.saveConfig(globalConfig);
    
    const hierarchical = await configManager.loadHierarchicalConfig(TEST_DIR);
    
    if (!hierarchical.sources || !hierarchical.sources.core) {
      throw new Error('Sources not tracked');
    }
    
    assertEquals(typeof hierarchical.sources.core, 'object', 'Core source should be object');
    assertEquals(typeof hierarchical.sources.global, 'object', 'Global source should be object');
  });

  // Test 10: Local config directory is discovered
  await test('Local config directory is discovered', async () => {
    const configManager = new ConfigManager();
    
    const localConfigDir = path.join(TEST_DIR, '.geese');
    fs.ensureDirSync(localConfigDir);
    
    const subdir = path.join(TEST_DIR, 'subdir', 'nested');
    fs.ensureDirSync(subdir);
    
    const found = configManager.getLocalConfigDir(subdir);
    
    if (!found) {
      throw new Error('Local config directory not found');
    }
    
    assertEquals(found, localConfigDir, 'Should find .geese directory in parent');
  });

  // Test 11: Dangerous keys are rejected
  await test('Dangerous keys in config are rejected', async () => {
    const configManager = new ConfigManager();
    
    const dangerousConfig = {
      goose: { model: 'gpt-4' },
      __proto__: { dangerous: 'value' }
    };
    
    const merged = configManager.deepMerge({}, dangerousConfig);
    
    assertEquals(merged.__proto__, undefined, '__proto__ should be rejected');
    assertEquals(merged.goose.model, 'gpt-4', 'Valid config should still work');
  });

  // Test 12: Full hierarchy without local config
  await test('Hierarchy works without local config', async () => {
    const configManager = new ConfigManager();
    
    // Only set global config
    await configManager.saveConfig({ goose: { model: 'gpt-4-turbo' } });
    
    // Use a directory without .geese folder
    const noLocalDir = path.join(TEST_DIR, 'no-local');
    fs.ensureDirSync(noLocalDir);
    
    const hierarchical = await configManager.loadHierarchicalConfig(noLocalDir);
    
    assertEquals(hierarchical.config.goose.model, 'gpt-4-turbo', 'Should use global config');
    assertEquals(hierarchical.config.goose.max_tokens, 2000, 'Should use core defaults');
  });

} finally {
  cleanup();
}

// Print results
console.log('\n' + '='.repeat(50));
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log('='.repeat(50) + '\n');

process.exit(failCount > 0 ? 1 : 0);
})();
