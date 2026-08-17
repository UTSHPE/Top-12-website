/**
 * Exercises /api/members/sync against a running dev server.
 *
 * Usage:  npm run test:sync          (start `npm run dev` first)
 *
 * Everything it writes uses the EID `test0000`, so cleanup is one statement:
 *   delete from members where eid = 'test0000';
 *
 * Reads the secret from the environment. Never hardcode it here — this
 * repository is public.
 */
import { readFileSync } from 'node:fs';

const URL_ = process.env.SYNC_URL ?? 'http://localhost:3000/api/members/sync';
const TEST_EID = 'test0000';

// Load .env.local by hand: `npm run` does not apply --env-file, and this needs
// to work as a plain `node scripts/test-member-sync.mjs` too.
loadEnvLocal();

const secret = process.env.MEMBER_SYNC_SECRET;
if (!secret) {
  console.error('MEMBER_SYNC_SECRET is not set (checked the environment and .env.local).');
  process.exit(1);
}

const member = {
  eid: TEST_EID,
  full_name: 'Maritza Aragon Rios',
  email: 'test0000@example.com',
  phone: '830-445-9244',
  major: 'Civil Engineering',
  class: 'Junior',
  shirt_size: 'L',
  date_of_birth: '12/2/2005',
};

async function post(label, { body, token = secret }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(URL_, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (err) {
    console.error(`\n${label}\n  REQUEST FAILED: ${err.message}`);
    console.error('  Is the dev server running? (npm run dev)');
    process.exit(1);
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text.slice(0, 200);
  }
  console.log(`\n${label}\n  ${res.status}  ${JSON.stringify(parsed)}`);
  return { status: res.status, body: parsed };
}

// --- The happy path, twice: insert then update the same row ---------------
await post('1. first sync            → expect 200 inserted', { body: member });
await post('2. same member again     → expect 200 updated', { body: member });

// --- Name handling ---------------------------------------------------------
await post('3. single-token name     → expect 200, last_name null', {
  body: { ...member, full_name: 'Cher' },
});

// --- Required fields -------------------------------------------------------
for (const field of ['eid', 'full_name', 'email']) {
  await post(`4. missing ${field.padEnd(10)}   → expect 400 naming "${field}"`, {
    body: { ...member, [field]: '   ' },
  });
}

// --- Email shape -----------------------------------------------------------
await post('5. malformed email       → expect 400 invalid_email', {
  body: { ...member, email: 'not-an-email' },
});

// --- Unparseable birthday is tolerated, not fatal --------------------------
await post('6. junk date_of_birth    → expect 200, birth_month_day null', {
  body: { ...member, date_of_birth: 'sometime in December' },
});

// --- Auth ------------------------------------------------------------------
await post('7. wrong secret          → expect 401', { body: member, token: 'wrong-secret' });
await post('8. no Authorization      → expect 401', { body: member, token: null });

console.log(`\nDone. Clean up with:  delete from members where eid = '${TEST_EID}';`);

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(new global.URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    const value = match[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    process.env[match[1]] ??= value;
  }
}
