/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

function runTestPhase09D() {
  console.log('================================================================');
  console.log('PHASE 09D: STANDALONE DEPLOYMENT & WINDOWS 11 RUNBOOK AUDIT');
  console.log('================================================================');

  const deploymentDir = path.join(process.cwd(), 'deployment', 'windows');
  const startBatPath = path.join(deploymentDir, 'start-tkb.bat');
  const setupBatPath = path.join(deploymentDir, 'setup-tkb.bat');
  const updateBatPath = path.join(deploymentDir, 'update-tkb.bat');
  const checkBatPath = path.join(deploymentDir, 'check-tkb.bat');
  const docPath = path.join(deploymentDir, 'WINDOWS_DEPLOYMENT.md');

  let allPassed = true;
  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      allPassed = false;
    }
  }

  // --- TEST A: start-tkb.bat exists ---
  assert(fs.existsSync(startBatPath), 'TEST A: start-tkb.bat exists');

  // --- TEST B: setup-tkb.bat exists ---
  assert(fs.existsSync(setupBatPath), 'TEST B: setup-tkb.bat exists');

  // --- TEST C: update-tkb.bat exists ---
  assert(fs.existsSync(updateBatPath), 'TEST C: update-tkb.bat exists');

  // --- TEST D: check-tkb.bat exists ---
  assert(fs.existsSync(checkBatPath), 'TEST D: check-tkb.bat exists');

  // --- TEST E: WINDOWS_DEPLOYMENT.md exists ---
  assert(fs.existsSync(docPath), 'TEST E: WINDOWS_DEPLOYMENT.md exists');

  const startBatContent = fs.readFileSync(startBatPath, 'utf-8');
  const setupBatContent = fs.readFileSync(setupBatPath, 'utf-8');
  const updateBatContent = fs.readFileSync(updateBatPath, 'utf-8');
  const checkBatContent = fs.readFileSync(checkBatPath, 'utf-8');
  const docContent = fs.readFileSync(docPath, 'utf-8');

  // --- TEST F: start script uses production start path ---
  const usesProductionStart =
    (startBatContent.includes('npm start') || startBatContent.includes('node dist/server.cjs') || startBatContent.includes('node dist\\server.cjs')) &&
    startBatContent.includes('NODE_ENV=production');
  assert(usesProductionStart, 'TEST F: start script uses production start path and sets NODE_ENV=production');

  // --- TEST G: start script does not invoke Vite/dev/tsx ---
  const invokesDev =
    startBatContent.includes('npm run dev') ||
    startBatContent.includes('vite') ||
    startBatContent.includes('tsx server.ts');
  assert(!invokesDev, 'TEST G: start script does not invoke Vite, dev mode, or tsx server.ts');

  // --- TEST H: setup performs npm install before npm run build ---
  const installIndex = setupBatContent.indexOf('npm install');
  const buildIndex = setupBatContent.indexOf('npm run build');
  assert(
    installIndex !== -1 && buildIndex !== -1 && installIndex < buildIndex,
    'TEST H: setup performs npm install before npm run build'
  );

  // --- TEST I: update uses git pull --ff-only ---
  assert(
    updateBatContent.includes('git pull --ff-only'),
    'TEST I: update uses git pull --ff-only'
  );

  // --- TEST J: update contains no destructive git commands ---
  const hasDestructiveGit =
    updateBatContent.includes('git reset --hard') ||
    updateBatContent.includes('git clean -fd') ||
    updateBatContent.includes('git pull -f') ||
    updateBatContent.includes('git pull --force');
  assert(
    !hasDestructiveGit,
    'TEST J: update contains no git reset --hard, git clean -fd, or force pull'
  );

  // --- TEST K: no BAT script kills generic node.exe ---
  const allBatContents = [startBatContent, setupBatContent, updateBatContent, checkBatContent];
  const killsGenericNode = allBatContents.some(
    (c) => c.toLowerCase().includes('taskkill') && c.toLowerCase().includes('node.exe')
  );
  assert(!killsGenericNode, 'TEST K: no BAT script kills generic node.exe');

  // --- TEST L: no BAT script automatically modifies firewall ---
  const modifiesFirewallInScript = allBatContents.some(
    (c) => c.toLowerCase().includes('netsh') && c.toLowerCase().includes('firewall')
  );
  assert(!modifiesFirewallInScript, 'TEST L: no BAT script automatically modifies firewall');

  // --- TEST M: health script targets /api/health ---
  assert(
    checkBatContent.includes('/api/health') &&
      (checkBatContent.includes('Invoke-RestMethod') || checkBatContent.includes('Invoke-WebRequest')),
    'TEST M: health check script targets /api/health with PowerShell native request'
  );

  // --- TEST N: scripts quote repository paths safely ---
  const quotesSafeStart = startBatContent.includes('"%SCRIPT_DIR%') || startBatContent.includes('"%REPO_ROOT%');
  const quotesSafeSetup = setupBatContent.includes('"%SCRIPT_DIR%') || setupBatContent.includes('"%REPO_ROOT%');
  const quotesSafeUpdate = updateBatContent.includes('"%SCRIPT_DIR%') || updateBatContent.includes('"%REPO_ROOT%');
  assert(
    quotesSafeStart && quotesSafeSetup && quotesSafeUpdate,
    'TEST N: scripts quote repository and script directory paths safely'
  );

  // --- TEST O: documentation contains localhost instructions ---
  const hasLocalhostDoc =
    docContent.includes('http://localhost:3000') &&
    docContent.toLowerCase().includes('localhost');
  assert(hasLocalhostDoc, 'TEST O: documentation contains localhost instructions');

  // --- TEST P: documentation contains LAN instructions ---
  const hasLanDoc =
    docContent.toLowerCase().includes('lan') &&
    docContent.includes('ipconfig') &&
    docContent.includes('0.0.0.0');
  assert(hasLanDoc, 'TEST P: documentation contains LAN instructions (ipconfig, 0.0.0.0)');

  // --- TEST Q: documentation warns API Key verification over plain LAN HTTP is not encrypted ---
  const hasLanKeyWarning =
    docContent.includes('/api/gemini/verify-key') &&
    (docContent.toLowerCase().includes('unencrypted') ||
      docContent.toLowerCase().includes('chua ma hoa') ||
      docContent.toLowerCase().includes('plain text') ||
      docContent.toLowerCase().includes('khong ma hoa'));
  assert(
    hasLanKeyWarning,
    'TEST Q: documentation warns API Key verification over plain LAN HTTP is not encrypted between browser and local server'
  );

  // --- TEST R: documentation contains backup-before-update workflow ---
  const hasBackupDoc =
    docContent.toLowerCase().includes('sao luu') &&
    docContent.toLowerCase().includes('export') &&
    docContent.toLowerCase().includes('backup');
  assert(hasBackupDoc, 'TEST R: documentation contains backup-before-update workflow');

  // --- TEST S: documentation contains GitHub update workflow ---
  const hasGithubUpdateDoc =
    docContent.includes('update-tkb.bat') &&
    docContent.includes('git pull --ff-only');
  assert(hasGithubUpdateDoc, 'TEST S: documentation contains GitHub update workflow');

  // --- TEST T: documentation contains Gemini 503 troubleshooting ---
  const has503Troubleshooting =
    docContent.includes('503') &&
    docContent.toLowerCase().includes('high demand');
  assert(has503Troubleshooting, 'TEST T: documentation contains Gemini 503 high demand troubleshooting');

  // --- TEST U: documentation states no Windows Service/autostart in 09D ---
  const statesNoService =
    docContent.toLowerCase().includes('windows service') &&
    (docContent.toLowerCase().includes('chua tich hop') ||
      docContent.toLowerCase().includes('interactive') ||
      docContent.toLowerCase().includes('standalone'));
  assert(statesNoService, 'TEST U: documentation states no Windows Service/autostart in 09D');

  // --- TEST V: Windows CMD parenthesis audit (HOTFIX 09D-M02) ---
  // Verify check-tkb.bat uses label jumps to avoid CMD ( ... ) parsing traps
  const checkUsesLabelJumps =
    checkBatContent.includes('goto :server_online') &&
    checkBatContent.includes('goto :server_offline');
  assert(checkUsesLabelJumps, 'TEST V.1: check-tkb.bat uses label jumps instead of fragile if/else parenthesized blocks');

  // Verify none of the BAT files contain unescaped parentheses in echo statements that could trigger ". was unexpected at this time"
  function auditBatForUnsafeParentheses(filename: string, content: string): boolean {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('::') || line.startsWith('REM')) continue;
      
      if (line.startsWith('echo ') || line.startsWith('echo.')) {
        const echoText = line.substring(4).trim();
        // Disallow closing parenthesis in echo unless escaped as ^)
        if (echoText.includes(')') && !echoText.includes('^)')) {
          console.error(`Unsafe echo with unescaped parenthesis in ${filename} at line ${i + 1}: "${line}"`);
          return false;
        }
      }
    }
    return true;
  }

  const checkSafe = auditBatForUnsafeParentheses('check-tkb.bat', checkBatContent);
  const startSafe = auditBatForUnsafeParentheses('start-tkb.bat', startBatContent);
  const setupSafe = auditBatForUnsafeParentheses('setup-tkb.bat', setupBatContent);
  const updateSafe = auditBatForUnsafeParentheses('update-tkb.bat', updateBatContent);
  assert(
    checkSafe && startSafe && setupSafe && updateSafe,
    'TEST V.2: All BAT scripts audited safe from CMD unescaped parenthesis parsing bugs'
  );

  console.log('================================================================');
  if (allPassed) {
    console.log('FINAL RESULT: ALL PHASE 09D TESTS PASSED');
  } else {
    console.error('FINAL RESULT: SOME PHASE 09D TESTS FAILED');
    process.exit(1);
  }
  console.log('================================================================');
}

runTestPhase09D();
