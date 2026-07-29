const assert = require('node:assert/strict');
const test = require('node:test');

const {
  assertLocalServices,
  waitForLocalServices,
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

test('waits until all local Docker services are reachable', async () => {
  let attempts = 0;

  await waitForLocalServices({
    configuration: localConfiguration,
    timeoutMs: 100,
    intervalMs: 0,
    assertLocalServicesImpl: async () => (++attempts === 1 ? ['MinIO'] : []),
    sleep: async () => {},
    now: (() => { let value = 0; return () => (value += 10); })(),
  });

  assert.equal(attempts, 2);
});

test('times out with only the final unavailable local service names', async () => {
  await assert.rejects(
    waitForLocalServices({
      configuration: localConfiguration,
      timeoutMs: 20,
      intervalMs: 0,
      assertLocalServicesImpl: async () => ['Redis'],
      sleep: async () => {},
      now: (() => { let value = 0; return () => (value += 10); })(),
    }),
    /Timed out waiting for local services: Redis/,
  );
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

test('bounds an individual backend health request by the overall timeout', async () => {
  let aborted = false;
  const timestamps = [0, 0, 10];

  await assert.rejects(
    waitForHealthyBackend({
      url: 'http://127.0.0.1:3000/health',
      timeoutMs: 10,
      intervalMs: 0,
      requestTimeoutMs: 1,
      fetchImpl: (_url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('request aborted'));
        });
      }),
      sleep: async () => {},
      now: () => timestamps.shift() ?? 10,
    }),
    /Timed out waiting for backend health/,
  );

  assert.equal(aborted, true);
});
