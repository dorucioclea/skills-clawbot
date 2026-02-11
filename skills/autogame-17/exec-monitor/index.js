const fs = require('fs');
const path = require('path');

// Configuration
const LOG_FILE = path.join(__dirname, '../../logs/exec_usage.jsonl');
const THRESHOLD = 10; // Alert after 10 exec calls in a short window

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Log exec usage
 * @param {string} command - The command executed
 * @param {string} context - The calling context (session ID or tool name)
 */
function logExecUsage(command, context = 'unknown') {
  const entry = {
    timestamp: new Date().toISOString(),
    command,
    context,
    type: 'exec'
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  
  // Simple analysis (optional: could be expanded to trigger alerts)
  // analyzeUsage();
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("Usage: node skills/exec-monitor/index.js <command> [context]");
    process.exit(1);
  }
  
  const command = args[0];
  const context = args[1] || 'cli';
  
  logExecUsage(command, context);
  console.log(`Logged exec usage: ${command}`);
}

module.exports = { logExecUsage };
