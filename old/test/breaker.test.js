const { assert } = require('chai');
const circuitBreaker = require('../lib/breaker');
const { MockService } = require('./services/mock-service/mock-service.class');

const sleep = async delay => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

describe('Basic Circuit Breaker Functionality', () => {
  let breaker;

  const ctx = {
    app: {
      service: () => MockService.prototype
    },
    path: 'mockService',
    params: {
      delay: null
    }
  };

  // These settings are configured to trip the breaker after the first failure,
  // rather than a percentage of failures
  const singleFailureSettings = {
    rollingCountTimeout: 10, // listens for failures for 10ms
    rollingCountBuckets: 1, // tracks failures for the entire 10ms block
    errorThresholdPercentage: 1 // breaker trips if greater than 1/100 attempts within 10ms fail
  };

  const options = {
    timeout: 500, // If our function takes longer than 0.5 seconds, trigger a failure
    resetTimeout: 1000, // After 1 second, try again.
    fallback: () => {
      // console.log('FALLBACK !!!!!!!!!!!!!');
      return {
        fallback: 'called'
      };
    },
    ...singleFailureSettings
  };

  it('creates a circuit breaker in the global namespace', async () => {
    const initialBreakerCount = Object.keys(global.breakers).length;

    const testCtx = {
      method: 'find',
      ...ctx
    };

    await circuitBreaker(options)(testCtx);

    assert.strictEqual(Object.keys(global.breakers).length, initialBreakerCount + 1);
    assert.ok(global.breakers.mockService);

    breaker = global.breakers.mockService;
  });

  it('uses the same circuit breaker for a different method', async () => {
    const initialBreakerCount = Object.keys(global.breakers).length;

    const testCtx = {
      method: 'get',
      id: 100,
      ...ctx
    };

    await circuitBreaker(options)(testCtx);

    assert.strictEqual(Object.keys(global.breakers).length, initialBreakerCount);
    assert.deepStrictEqual(testCtx.result, { id: 1, name: 'john' });
  });

  it('adds a successful method call response to ctx.result', async () => {
    const testCtx = {
      method: 'find',
      ...ctx
    };

    await circuitBreaker(options)(testCtx);

    assert.deepStrictEqual(testCtx.result, [{ id: 1, name: 'john' }]);
  });

  it('creates a new breaker if options.circuitOwner', async () => {
    const testOptions = {
      circuitOwner: 'partDeux',
      ...options
    };

    const testCtx = {
      method: 'find',
      ...ctx
    };

    const initialBreakerCount = Object.keys(global.breakers).length;

    await circuitBreaker(testOptions)(testCtx);

    assert.strictEqual(Object.keys(global.breakers).length, initialBreakerCount + 1);
    assert.ok(global.breakers.mockService);
    assert.ok(global.breakers['mockService|partDeux']);
  });

  it('allows requests through one breaker when another is open', async () => {
    const testOptions = {
      circuitOwner: 'partDeux',
      ...options
    };

    const testCtx = {
      method: 'find',
      ...ctx
    };

    breaker.open();

    await circuitBreaker(testOptions)(testCtx);

    assert.deepStrictEqual(testCtx.result, [{ id: 1, name: 'john' }]);

    breaker.close();

    delete global.breakers['mockService|partDeux'];
  });

  it('allows concurrent requests of the same method', async () => {
    const fry = {
      method: 'create',
      data: { id: 1 },
      ...ctx
    };

    const rodriguez = {
      method: 'create',
      data: { id: 2 },
      ...ctx
    };

    const leela = {
      method: 'create',
      data: { id: 3 },
      ...ctx
    };

    const farnsworth = {
      method: 'create',
      data: { id: 4 },
      ...ctx
    };

    const [
      philip,
      bender,
      turanga,
      hubert
    ] = await Promise.all([
      circuitBreaker(options)(fry),
      circuitBreaker(options)(rodriguez),
      circuitBreaker(options)(leela),
      circuitBreaker(options)(farnsworth)
    ]);

    assert.deepStrictEqual(philip.result, { id: 1 });
    assert.deepStrictEqual(bender.result, { id: 2 });
    assert.deepStrictEqual(turanga.result, { id: 3 });
    assert.deepStrictEqual(hubert.result, { id: 4 });
  });

  it('allows concurrent requests for different methods', async () => {
    const createCall = {
      method: 'create',
      data: { id: 1 },
      ...ctx
    };

    const getCall = {
      method: 'get',
      id: 300,
      ...ctx
    };

    const findCall = {
      method: 'find',
      ...ctx
    };

    const updateCall = {
      method: 'update',
      ...ctx
    };

    updateCall.params.delay = 200;

    const [
      create,
      get,
      find,
      update
    ] = await Promise.all([
      circuitBreaker(options)(createCall),
      circuitBreaker(options)(getCall),
      circuitBreaker(options)(findCall),
      circuitBreaker(options)(updateCall)
    ]);

    assert.deepStrictEqual(create.result, { id: 1 });
    assert.deepStrictEqual(get.result, { id: 1, name: 'john' });
    assert.deepStrictEqual(find.result, [{ id: 1, name: 'john' }]);
    assert.deepStrictEqual(update.result, [{ id: 1, name: 'frank' }]);
  });

  it('adds event listeners when given valid fields and functions', async () => {
    const eventedOptions = {
      circuitOwner: 'events',
      onReject: () => console.log('Rejected, circuit open'),
      ...options
    };

    const testCtx = {
      method: 'remove',
      ...ctx
    };

    await circuitBreaker(eventedOptions)(testCtx);

    const eventedBreaker = global.breakers['mockService|events'];

    const onRejectListener = eventedBreaker._events.reject
      .filter(func => func.name === 'onReject')[0];

    assert.ok(onRejectListener);
    assert.ok(typeof onRejectListener === 'function');

    delete global.breakers['mockService|events'];
  });

  it('does not add event listeners when given invalid fields', async () => {
    const uneventedOptions = {
      circuitOwner: 'invalidEvents',
      success: () => console.log('Success!!'),
      onNotABaseEvent: () => console.log('Rejected, circuit open'),
      ...options
    };

    const testCtx = {
      method: 'patch',
      ...ctx
    };

    await circuitBreaker(uneventedOptions)(testCtx);

    const uneventedBreaker = global.breakers['mockService|invalidEvents'];

    // test against event without 'on' prefix
    const successListeners = uneventedBreaker._events.success
      .filter(func => func.name === 'success');

    assert.ok(!successListeners.includes('success'));

    // test non-baseEvent
    const invalidListenerCheck = () => {
      const listeners = Object.keys(uneventedBreaker._events)
        .flatMap(event => uneventedBreaker._events[event])
        .map(func => func.name);

      return listeners.includes('onNotABaseEvent');
    };

    assert.ok(!invalidListenerCheck());

    delete global.breakers['mockService|invalidEvents'];
  });

  it('executes the event listener functions', async () => {
    const testReturn = {};

    const eventedOptions = {
      circuitOwner: 'events',
      onReject: () => {
        testReturn.onReject = 'reject event function executed';
        return testReturn;
      },
      onOpen: () => {
        testReturn.onOpen = 'open event function executed';
        return testReturn;
      },
      ...options
    };

    const testCtx = {
      method: 'remove',
      ...ctx
    };

    await circuitBreaker(eventedOptions)(testCtx);

    global.breakers['mockService|events'].open();

    await circuitBreaker(eventedOptions)(testCtx);

    assert.strictEqual(testReturn.onReject, 'reject event function executed');
    assert.strictEqual(testReturn.onOpen, 'open event function executed');

    delete global.breakers['mockService|events'];
  });

  it('flips the breaker and executes the provided fallback after a failed request', async () => {
    const testCtx = {
      method: 'find',
      ...ctx
    };

    testCtx.params.delay = 1000;

    const test = await circuitBreaker(options)(testCtx);

    assert.ok(breaker.opened);
    assert.strictEqual(test.result.fallback, 'called');
    breaker.close();
  });

  it('stops traffic and executes the provided fallback when opened after a failure', async () => {
    const testCtx = {
      method: 'find',
      ...ctx
    };

    testCtx.params.delay = 1000;

    await circuitBreaker(options)(testCtx);

    testCtx.params.delay = 100;

    const [
      test1,
      test2,
      test3
    ] = await Promise.all([
      circuitBreaker(options)(testCtx),
      circuitBreaker(options)(testCtx),
      circuitBreaker(options)(testCtx)
    ]);

    assert.strictEqual(test1.result.fallback, 'called');
    assert.strictEqual(test2.result.fallback, 'called');
    assert.strictEqual(test3.result.fallback, 'called');

    breaker.close();
  });

  it('recloses after a successful test request', async () => {
    const testCtx = {
      method: 'find',
      ...ctx
    };

    breaker.open();

    await sleep(1100);

    const test = await circuitBreaker(options)(testCtx);

    assert.deepStrictEqual(test.result, [{ id: 1, name: 'john' }]);
    assert.ok(breaker.closed);
  });

  it('reopens after an unsuccessful test request', async () => {
    const testCtx = {
      method: 'find',
      ...ctx
    };

    breaker.open();

    await sleep(1100);

    testCtx.params.delay = 1000;

    const test = await circuitBreaker(options)(testCtx);

    assert.strictEqual(test.result.fallback, 'called');
    assert.ok(breaker.opened);

    breaker.close();
  });

  it('executes the default fallback if not given a fallback function', async () => {
    const testCtx = {
      method: 'patch',
      id: 1000,
      data: {
        name: 'Philip J Fry'
      },
      ...ctx
    };

    const testOptions = { ...options };

    delete testOptions.fallback;

    const test = await circuitBreaker(testOptions)(testCtx);

    const expectedResult = {
      status: 'fallback called',
      breakerState: 'closed',
      id: 1000,
      data: { name: 'Philip J Fry' },
      params: { delay: 1000 }
    };

    assert.ok(breaker.open);
    assert.deepStrictEqual(test.result, expectedResult);

    breaker.close();
  });
});
