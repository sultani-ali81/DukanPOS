const net = require('node:net');

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function probeTcp({ host, port, timeoutMs = 3000, netImpl = net }) {
  return new Promise((resolve) => {
    const socket = netImpl.createConnection({ host, port: Number(port) });
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

async function probeHttp({ url, timeoutMs = 3000, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function assertLocalServices({
  configuration,
  probeTcpImpl = probeTcp,
  probeHttpImpl = probeHttp,
}) {
  const checks = [
    {
      name: 'PostgreSQL',
      check: () => probeTcpImpl({
        name: 'PostgreSQL',
        host: configuration.DB_HOST,
        port: configuration.DB_PORT,
      }),
    },
    {
      name: 'Redis',
      check: () => probeTcpImpl({
        name: 'Redis',
        host: configuration.REDIS_HOST,
        port: configuration.REDIS_PORT,
      }),
    },
    {
      name: 'MinIO',
      check: () => probeHttpImpl({
        name: 'MinIO',
        url: `http://${configuration.MINIO_ENDPOINT}:${configuration.MINIO_PORT}/minio/health/live`,
      }),
    },
  ];

  const results = await Promise.all(checks.map(async ({ name, check }) => ({
    name,
    ready: await check(),
  })));

  return results.filter(({ ready }) => !ready).map(({ name }) => name);
}

async function waitForHealthyBackend({
  url,
  timeoutMs = 45000,
  intervalMs = 500,
  fetchImpl = fetch,
  sleep: sleepImpl = sleep,
  now = Date.now,
}) {
  const deadline = now() + timeoutMs;

  while (true) {
    try {
      const response = await fetchImpl(url);
      if (response.ok) {
        const body = await response.json();
        if (body && body.status === 'ok') return;
      }
    } catch {
      // A backend that has not opened its port yet is retried until the deadline.
    }

    if (now() >= deadline) {
      throw new Error(`Timed out waiting for backend health at ${url}`);
    }

    await sleepImpl(intervalMs);
  }
}

module.exports = {
  assertLocalServices,
  probeHttp,
  probeTcp,
  waitForHealthyBackend,
};
