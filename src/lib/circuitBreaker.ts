import redis from '@/lib/redis';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_SECONDS = 60;
const OPEN_DURATION_SECONDS = 300; // 5 minutes

function stateKey(tenantId: string) {
  return `circuit:speechmatics:${tenantId}:state`;
}
function failureKey(tenantId: string) {
  return `circuit:speechmatics:${tenantId}:failures`;
}

async function getState(tenantId: string): Promise<CircuitState> {
  const state = await redis.get(stateKey(tenantId));
  return (state as CircuitState) || 'CLOSED';
}

async function recordFailure(tenantId: string): Promise<number> {
  const key = failureKey(tenantId);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, FAILURE_WINDOW_SECONDS);
  return count;
}

async function openCircuit(tenantId: string): Promise<void> {
  await redis.set(stateKey(tenantId), 'OPEN', 'EX', OPEN_DURATION_SECONDS);
  await redis.del(failureKey(tenantId));
}

async function closeCircuit(tenantId: string): Promise<void> {
  await redis.del(stateKey(tenantId));
  await redis.del(failureKey(tenantId));
}

async function halfOpenCircuit(tenantId: string): Promise<void> {
  await redis.set(stateKey(tenantId), 'HALF_OPEN', 'EX', 30);
}

export async function circuitBreakerExecute<T>(
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  const state = await getState(tenantId);

  if (state === 'OPEN') {
    throw new Error('Circuit breaker OPEN: Speechmatics unavailable');
  }

  try {
    const result = await fn();
    // Success: if HALF_OPEN, close the circuit
    if (state === 'HALF_OPEN') {
      await closeCircuit(tenantId);
    }
    return result;
  } catch (err) {
    // Record failure
    const count = await recordFailure(tenantId);

    if (state === 'HALF_OPEN' || count >= FAILURE_THRESHOLD) {
      await openCircuit(tenantId);
      console.warn(`[CircuitBreaker] Circuit OPENED for tenant ${tenantId}`);
    }

    throw err;
  }
}

export async function getCircuitState(tenantId: string): Promise<CircuitState> {
  return getState(tenantId);
}
