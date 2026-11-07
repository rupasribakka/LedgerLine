import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mutations = [
  {
    id: 1,
    name: 'remove FOR UPDATE from accounts lock query in src/ledger.js',
    file: 'src/ledger.js',
    mutate(content) {
      if (!content.includes('FOR UPDATE')) {
        throw new Error('Mutation 1: FOR UPDATE not found in src/ledger.js');
      }
      return content.replace(
        /ORDER BY id ASC\r?\n\s+FOR UPDATE/,
        'ORDER BY id ASC'
      );
    },
  },
  {
    id: 2,
    name: 'remove idempotency INSERT ... ON CONFLICT in src/ledger.js',
    file: 'src/ledger.js',
    mutate(content) {
      if (!content.includes('ON CONFLICT (user_id, key) DO NOTHING')) {
        throw new Error('Mutation 2: ON CONFLICT not found in src/ledger.js');
      }
      return content.replace(
        /await client\.query\(\s*`INSERT INTO idempotency_keys[\s\S]*?ON CONFLICT \(user_id, key\) DO NOTHING`,\s*\[user\.id, cleanKey, requestHash\]\s*\);/,
        '/* MUTATION: removed idempotency INSERT ... ON CONFLICT */'
      );
    },
  },
  {
    id: 3,
    name: 'remove balance check in src/ledger.js',
    file: 'src/ledger.js',
    mutate(content) {
      if (!content.includes('currentFromBalance < amountPaise')) {
        throw new Error('Mutation 3: balance check not found in src/ledger.js');
      }
      return content.replace(
        /\/\/ User accounts floor is 0; external account is permitted to go negative\r?\n\s*if \(!fromAccount\.is_external && currentFromBalance < amountPaise\) \{[\s\S]*?reason,\s*\}\);\s*\}/,
        '/* MUTATION: removed balance check */'
      );
    },
  },
  {
    id: 4,
    name: 'drop chk_no_overdraft constraint in migrations/001_initial_schema.sql',
    file: 'migrations/001_initial_schema.sql',
    mutate(content) {
      if (!content.includes('chk_no_overdraft')) {
        throw new Error('Mutation 4: chk_no_overdraft not found in migrations/001_initial_schema.sql');
      }
      return content.replace(
        /,\r?\n\s*CONSTRAINT chk_no_overdraft CHECK \(is_external OR balance_paise >= 0\)/,
        '\n    -- CONSTRAINT chk_no_overdraft CHECK (is_external OR balance_paise >= 0)'
      );
    },
  },
  {
    id: 5,
    name: 'remove replay branch in src/ledger.js',
    file: 'src/ledger.js',
    mutate(content) {
      if (!content.includes("existingKey.state === 'completed'")) {
        throw new Error('Mutation 5: replay branch not found in src/ledger.js');
      }
      return content.replace(
        /\/\/ If key has already been resolved in a prior completed\/refused request\r?\n\s*if \(existingKey\.state === 'completed' \|\| existingKey\.state === 'refused'\) \{[\s\S]*?isReplay: true,\s*\};\s*\}/,
        '/* MUTATION: removed replay branch */'
      );
    },
  },
  {
    id: 6,
    name: 'remove holder ownership check in src/ledger.js',
    file: 'src/ledger.js',
    mutate(content) {
      if (!content.includes('fromAccount.owner_id !== user.id')) {
        throw new Error('Mutation 6: holder ownership check not found in src/ledger.js');
      }
      return content.replace(
        /\} else if \(fromAccount\.owner_id !== user\.id\) \{[\s\S]*?authRefusalReason = `Holder does not own source account \$\{fromAccount\.account_no\}\.`;\s*\}/,
        '}'
      );
    },
  },
];

function runTest() {
  try {
    const stdout = execSync('npm test', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    return { exitCode: 0, output: stdout, failedCount: 0 };
  } catch (error) {
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';
    const output = `${stdout}\n${stderr}`;

    let failedCount = 0;
    const testMatch = output.match(/Tests\s+(\d+)\s+failed/i);
    if (testMatch) {
      failedCount = parseInt(testMatch[1], 10);
    } else {
      const suiteMatch = output.match(/Failed Suites\s+(\d+)/i);
      if (suiteMatch) {
        failedCount = parseInt(suiteMatch[1], 10);
      } else {
        failedCount = 1;
      }
    }
    return { exitCode: error.status || 1, output, failedCount };
  }
}

function verifyGitClean(relFile) {
  const diff = execSync(`git diff -- "${relFile}"`, {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (diff.trim().length > 0) {
    throw new Error(`CRITICAL: File ${relFile} has uncommitted diff after restore:\n${diff}`);
  }
}

async function main() {
  console.log('================================================================');
  console.log(' LedgerLine Mutation Testing Harness');
  console.log('================================================================\n');

  const results = [];

  for (const m of mutations) {
    console.log(`\n[MUTATION ${m.id}/6] Testing: ${m.name}`);
    const absPath = path.resolve(rootDir, m.file);
    const originalContent = fs.readFileSync(absPath, 'utf8');

    // 1. Apply mutation
    const mutatedContent = m.mutate(originalContent);
    if (mutatedContent === originalContent) {
      throw new Error(`Mutation ${m.id} produced identical content — target pattern did not match!`);
    }

    try {
      fs.writeFileSync(absPath, mutatedContent, 'utf8');
      console.log(`  -> Applied mutation to ${m.file}`);

      // 2. Run npm test expecting failure
      console.log(`  -> Running npm test...`);
      const testResult = runTest();

      const killed = testResult.exitCode !== 0 || testResult.failedCount > 0;
      const verdict = killed ? 'KILLED' : 'SURVIVED';

      console.log(`  -> Result: Exit code ${testResult.exitCode}, Failed tests: ${testResult.failedCount} => ${verdict}`);

      results.push({
        id: m.id,
        name: m.name,
        failedCount: testResult.failedCount,
        verdict,
      });
    } finally {
      // 3. Restore original content
      fs.writeFileSync(absPath, originalContent, 'utf8');
      verifyGitClean(m.file);
      console.log(`  -> Restored ${m.file} and verified clean git diff.`);
    }
  }

  // Print final summary table
  console.log('\n================================================================');
  console.log(' MUTATION TESTING RESULTS');
  console.log('================================================================\n');

  console.log('| # | Mutation Description | Failed Tests | Verdict |');
  console.log('|---|----------------------|:------------:|:-------:|');
  for (const r of results) {
    console.log(`| ${r.id} | ${r.name} | ${r.failedCount} | **${r.verdict}** |`);
  }
  console.log('\n================================================================');

  const survived = results.filter((r) => r.verdict === 'SURVIVED');
  if (survived.length > 0) {
    console.error(`\nFAILED: ${survived.length} mutation(s) SURVIVED! Tests must be strengthened.\n`);
    process.exit(1);
  } else {
    console.log(`\nSUCCESS: All ${results.length} mutations were KILLED. Mutation coverage 100%.\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during mutation checking:', err);
  process.exit(1);
});
