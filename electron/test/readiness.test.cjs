const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertLocalServices,
  waitForHealthyBackend,
} = require('../lib/readiness.cjs');

const localConfiguration = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  MINIO_ENDPOINT: '127.0.0.1',
  MINIO_PORT: '9000',
};

test('names only the manually started service that is unavailable', async () => {
  const unavailable = await assertLocalServices({
    configuration: localConfiguration,
    probeTcpImpl: async ({ name }) => name !== 'Redis',
    probeHttpImpl: async () => true,
  });

  assert.deepEqual(unavailable, ['Redis']);
});

test('waits for a healthy backend response after a transient failure', async () => {
  let calls = 0;
  let currentTime = 0;

  await waitForHealthyBackend({
    url: 'http://127.0.0.1:3000/health',
    timeoutMs: 100,
    intervalMs: 0,
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? { ok: false, json: async () => ({}) }
        : { ok: true, json: async () => ({ status: 'ok' }) };
    },
    sleep: async () => {},
    now: () => {
      currentTime += 10;
      return currentTime;
    },
  });

  assert.equal(calls, 2);
});
