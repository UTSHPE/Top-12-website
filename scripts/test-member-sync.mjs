/**
 * Exercises /api/members/sync against a running dev server.
 *
 * Usage:  npm run test:sync          (start `npm run dev` first)
 *
 * Everything it writes uses the EIDs `test0000` and `test0001`, and it deletes
 * both when it finishes. If it dies partway, clean up with:
 *   delete from members where eid in ('test0000', 'test0001');
 *
 * Reads the secret from the environment. Never hardcode it here — this
 * repository is public. Nothing in this file prints a secret or a key.
 *
 * Status codes alone can't tell whether a name was stored correctly, so where
 * it matters the row is read back with the service-role key and asserted on.
 * That is what makes the full_name cases a real regression check on the path
 * the paid form uses in production.
 */
import { readFileSync } from 'node:fs';

const URL_ = process.env.SYNC_URL ?? 'http://localhost:3000/api/members/sync';
const TEST_EID = 'test0000';
const PAIR_EID = 'test0001';

// Load .env.local by hand: `npm run` does not apply --env-file, and this needs
// to work as a plain `node scripts/test-member-sync.mjs` too.
loadEnvLocal();

const secret = process.env.MEMBER_SYNC_SECRET;
if (!secret) {
  console.error('MEMBER_SYNC_SECRET is not set (checked the environment and .env.local).');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRead = Boolean(SUPABASE_URL && SERVICE_KEY);
if (!canRead) {
  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found — ' +
      'status codes will be checked but stored values will not.'
  );
}

let failures = 0;

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

/** The non-paid form's shape: names already split, no full_name at all. */
const splitMember = {
  eid: PAIR_EID,
  first_name: 'Ana Maria',
  last_name: 'Gonzalez',
  email: 'test0001@example.com',
  major: 'Mechanical Engineering',
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

function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`    [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
}

/** Expect a 400 that names a specific field. */
function expect400(res, field) {
  check(`400 missing_field naming "${field}"`,
    res.status === 400 &&
      res.body?.error === 'missing_field' &&
      String(res.body?.message ?? '').includes(field),
    `${res.status} ${res.body?.message ?? ''}`);
}

async function db(path, init = {}) {
  if (!canRead) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const readMember = (eid) =>
  db(`members?eid=eq.${eid}&select=eid,first_name,last_name,full_name_raw,phone,major,position,birth_month_day`)
    .then((rows) => (Array.isArray(rows) ? (rows[0] ?? null) : null));

/** Assert stored columns, skipping silently when there is no service key. */
async function expectStored(eid, expected) {
  if (!canRead) return;
  const row = await readMember(eid);
  if (!row) return check('row readable', false, `no row for eid=${eid}`);
  for (const [column, want] of Object.entries(expected)) {
    check(`${column} = ${JSON.stringify(want)}`, row[column] === want, `got ${JSON.stringify(row[column])}`);
  }
}

// --- Clean slate ------------------------------------------------------------
for (const eid of [TEST_EID, PAIR_EID]) {
  await db(`members?eid=eq.${eid}`, { method: 'DELETE' });
}

// --- The live path: full_name only. THIS IS THE REGRESSION CHECK ------------
// The paid form sends neither first_name nor last_name, so it must behave
// exactly as it did before pre-split names were accepted.
await post('1. full_name only        → expect 200 inserted', { body: member });
await expectStored(TEST_EID, {
  first_name: 'Maritza',
  last_name: 'Aragon Rios',
  full_name_raw: 'Maritza Aragon Rios',
});

await post('2. same member again     → expect 200 updated', { body: member });

// --- Name handling ----------------------------------------------------------
await post('3. single-token name     → expect 200, last_name null', {
  body: { ...member, full_name: 'Cher' },
});
await expectStored(TEST_EID, { first_name: 'Cher', last_name: null, full_name_raw: 'Cher' });

// Restore the real name for the checks below.
await post('4. restore full name     → expect 200 updated', { body: member });

// --- Pre-split names, the non-paid form's shape -----------------------------
await post('5. first+last, no full   → expect 200 inserted', { body: splitMember });
await expectStored(PAIR_EID, {
  // Stored verbatim. Re-splitting would give "Ana" / "Maria Gonzalez".
  first_name: 'Ana Maria',
  last_name: 'Gonzalez',
  full_name_raw: 'Ana Maria Gonzalez',
});

await post('6. all three fields      → expect 200, pair wins, raw from full_name', {
  body: { ...splitMember, full_name: 'Ana Maria Gonzalez Perez' },
});
await expectStored(PAIR_EID, {
  first_name: 'Ana Maria',
  last_name: 'Gonzalez',
  full_name_raw: 'Ana Maria Gonzalez Perez',
});

// --- Half a pair is never half-used ----------------------------------------
expect400(
  await post('7. first_name only       → expect 400 naming last_name', {
    body: { eid: PAIR_EID, first_name: 'Ana Maria', email: splitMember.email },
  }),
  'last_name'
);
expect400(
  await post('8. last_name only        → expect 400 naming first_name', {
    body: { eid: PAIR_EID, last_name: 'Gonzalez', email: splitMember.email },
  }),
  'first_name'
);
expect400(
  await post('9. no name at all        → expect 400 naming full_name', {
    body: { eid: PAIR_EID, email: splitMember.email },
  }),
  'full_name'
);

// --- Required fields --------------------------------------------------------
for (const field of ['eid', 'full_name', 'email']) {
  expect400(
    await post(`10. missing ${field.padEnd(10)}  → expect 400 naming "${field}"`, {
      body: { ...member, [field]: '   ' },
    }),
    field
  );
}

// --- Email shape ------------------------------------------------------------
{
  const res = await post('11. malformed email      → expect 400 invalid_email', {
    body: { ...member, email: 'not-an-email' },
  });
  check('400 invalid_email', res.status === 400 && res.body?.error === 'invalid_email', String(res.status));
}

// --- Unparseable birthday is tolerated, not fatal ---------------------------
await post('12. junk date_of_birth   → expect 200, birth_month_day null', {
  body: { ...member, date_of_birth: 'sometime in December' },
});
await expectStored(TEST_EID, { birth_month_day: null });

// --- Blank optionals become null, never "" ----------------------------------
await post('13. blank optionals      → expect 200, phone null', {
  body: { ...member, phone: '   ', major: '' },
});
await expectStored(TEST_EID, { phone: null, major: null });

// Restore, so the row is in a sensible state for the checks below.
await post('14. restore optionals    → expect 200 updated', { body: member });

// --- EID is normalized to lowercase -----------------------------------------
{
  const res = await post('15. uppercase EID        → expect 200, stored lowercase', {
    body: { ...splitMember, eid: PAIR_EID.toUpperCase() },
  });
  check('response echoes the lowercased eid', res.body?.eid === PAIR_EID, String(res.body?.eid));
  check('no second row created for the uppercase spelling',
    !canRead || (await readMember(PAIR_EID.toUpperCase())) === null);
  await expectStored(PAIR_EID, { eid: PAIR_EID });
}

// --- `position` is assigned by officers and must survive a resync -----------
if (canRead) {
  await db(`members?eid=eq.${TEST_EID}`, {
    method: 'PATCH',
    body: JSON.stringify({ position: 'President' }),
  });
  await post('16. resync after promotion → expect 200, position untouched', { body: member });
  await expectStored(TEST_EID, { position: 'President' });
} else {
  console.log('\n16. position survival     → skipped (no service key)');
}

// --- Auth -------------------------------------------------------------------
{
  const bad = await post('17. wrong secret         → expect 401', { body: member, token: 'wrong-secret' });
  check('401 unauthorized', bad.status === 401, String(bad.status));
  const none = await post('18. no Authorization     → expect 401', { body: member, token: null });
  check('401 unauthorized', none.status === 401, String(none.status));
}

// --- Cleanup ----------------------------------------------------------------
for (const eid of [TEST_EID, PAIR_EID]) {
  await db(`members?eid=eq.${eid}`, { method: 'DELETE' });
}
if (canRead) {
  const left = [];
  for (const eid of [TEST_EID, PAIR_EID]) if (await readMember(eid)) left.push(eid);
  check('test rows deleted', left.length === 0, left.join(', '));
} else {
  console.log(`\nClean up with:  delete from members where eid in ('${TEST_EID}', '${PAIR_EID}');`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(new global.URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    return;
  }
  // Split on \r?\n, not \n. On a CRLF .env.local every line would otherwise
  // keep a trailing \r, and `.` does not match \r in JavaScript — it is a line
  // terminator — so `(.*)$` fails on every line except the last one in the
  // file. That silently loaded exactly one variable and made the checks that
  // need the service key skip themselves, cleanup included.
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([\w.-]+)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    const value = match[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    process.env[match[1]] ??= value;
  }
}
