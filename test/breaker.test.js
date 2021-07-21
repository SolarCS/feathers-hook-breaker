const assert = require('assert');
const circuitBreaker = require('../lib/breaker');
const { MockService } = require('./services/mock-service/mock-service.class');

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
    timeout: 3000, // If our function takes longer than 0.2 seconds, trigger a failure
    resetTimeout: 3000, // After 3 seconds, try again.
    fallback: () => {
      console.log('FALLBACK !!!!!!!!!!!!!');
      return {
        fallback: 'called',
        method: ctx.method
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
      method: 'find',
      ...ctx
    };

    await circuitBreaker(eventedOptions)(testCtx);

    const eventedBreaker = global.breakers['mockService|events'];

    const onRejectListener = eventedBreaker._events.reject
      .filter(func => func.name === 'onReject')[0];

    assert.ok(onRejectListener);
    assert.ok(typeof onRejectListener === 'function');
  });

  it('does not add event listeners when given invalid fields', async () => {
    const uneventedOptions = {
      circuitOwner: 'invalidEvents',
      success: () => console.log('Success!!'),
      onNotABaseEvent: () => console.log('Rejected, circuit open'),
      ...options
    };

    const testCtx = {
      method: 'find',
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
  });
});

// #####################################################
//        OLD TESTS JUST FOR REFERENCE AND IDEAS
// #####################################################

// const timeout = async delay => {
//   return new Promise(resolve => setTimeout(resolve, delay));
// };
// await timeout(1200);

// describe('Feathers Opossum Tests Methods', () => {
//   before(async () => {
//     // These settings are configured to trip the breaker after the first failure,
//     // rather than a percentage of failures
//     const singleFailureSettings = {
//       rollingCountTimeout: 10, // listens for failures for 10ms
//       rollingCountBuckets: 1, // tracks failures for the entire 10ms block
//       errorThresholdPercentage: 1 // breaker trips if greater than 1/100 attempts within 10ms fail
//     };

//     const options = {
//       opossum: {
//         timeout: 200, // If our function takes longer than 0.2 seconds, trigger a failure
//         resetTimeout: 3000, // After 3 seconds, try again.
//         ...singleFailureSettings
//       }
//     };

//     const mockService = CircuitBreaker(Service, { delay: 100 }, options);
//     app.use('/adapter', mockService);
//   });

//   it('adapter class methods', async () => {
//     assert.strictEqual(typeof app.service('adapter').get, 'function', 'Error', 'Got not a response status');
//     assert.strictEqual(typeof app.service('adapter').find, 'function', 'Error', 'Got not a response status');
//     assert.strictEqual(typeof app.service('adapter').update, 'function', 'Error', 'Got not a response status');
//     assert.strictEqual(typeof app.service('adapter').patch, 'function', 'Error', 'Got not a response status');
//     assert.strictEqual(typeof app.service('adapter').remove, 'function', 'Error', 'Got not a response status');
//   });
// });

// describe('Feathers Opossum Tests Simple Configuration', () => {
//   before(async () => {
//     const options = {
//       opossum: {
//         timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
//         errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
//         resetTimeout: 1000 // After 30 seconds, try again.
//       },
//       // this means only find and get method relay on circur breaking
//       methods: ['find', 'get']
//     };

//     const mockService = CircuitBreaker(Service, { delay: 10 }, options);

//     app.use('/adapter', mockService);
//   });

//   it('faster than timeout', async () => {
//     const result = await app.service('adapter').get(1, { name: 'John' });
//     assert.strictEqual(result.id, 1, 'Timed out after 100ms');
//   });

//   it('slower than timeout first timeout', async () => {
//     try {
//       await app.service('adapter').get(200);
//       throw new Error('Should never get here');
//     } catch (error) {
//       assert.strictEqual(error.message, 'Timed out after 100ms');
//     }
//   });

//   it('slower than timeout second timeout', async () => {
//     try {
//       await app.service('adapter').get(200);
//       throw new Error('Should never get here');
//     } catch (error) {
//       assert.strictEqual(error.message, 'Timed out after 100ms');
//     }
//   });

//   it('slower than timeout third - breaker is open', async () => {
//     try {
//       await app.service('adapter').get(200);
//       throw new Error('Should never get here');
//     } catch (error) {
//       assert.strictEqual(error.message, 'Breaker is open');
//     }
//   });

//   it('wait - breaker is closed', async () => {
//     const timeout = async delay => {
//       return new Promise(resolve => setTimeout(resolve, delay));
//     };
//     await timeout(1200);
//     const result = await app.service('adapter').get(1);
//     assert.strictEqual(result.id, 1, 'Result ok');
//   });
// });

// describe('Feathers Opossum Tests Structured Configuration', () => {
//   before(async () => {
//     const options = {
//       find: {
//         opossum: {
//           timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
//           errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
//           resetTimeout: 1000 // After 30 seconds, try again.
//         }
//       },
//       get: {
//         opossum: {
//           timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
//           errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
//           resetTimeout: 1000 // After 30 seconds, try again.
//         }
//       }
//     };

//     const mockService = CircuitBreaker(Service, { delay: 10 }, options);

//     app.use('/adapter', mockService);
//   });

//   it('faster than timeout', async () => {
//     const result = await app.service('adapter').get(1, { name: 'John' });
//     assert.strictEqual(result.id, 1, 'Timed out after 200ms');
//   });

//   it('slower than timeout first timeout', async () => {
//     try {
//       await app.service('adapter').get(200);
//       throw new Error('Should never get here');
//     } catch (error) {
//       assert.strictEqual(error.message, 'Timed out after 100ms');
//     }
//   });

//   it('slower than timeout second timeout', async () => {
//     try {
//       await app.service('adapter').get(200);
//       throw new Error('Should never get here');
//     } catch (error) {
//       assert.strictEqual(error.message, 'Timed out after 100ms');
//     }
//   });

//   it('slower than timeout third - breaker is open', async () => {
//     try {
//       await app.service('adapter').get(200);
//       throw new Error('Should never get here');
//     } catch (error) {
//       assert.strictEqual(error.message, 'Breaker is open');
//     }
//   });

//   it('wait - breaker is closed', async () => {
//     const timeout = async delay => {
//       return new Promise(resolve => setTimeout(resolve, delay));
//     };
//     await timeout(1200);
//     const result = await app.service('adapter').get(1);
//     assert.strictEqual(result.id, 1, 'Result ok');
//   });
// });

// describe('Feathers Opossum Tests Fallback', () => {
//   const emitter = new EventEmitter();
//   before(async () => {
//     const options = {
//       get: {
//         opossum: {
//           timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
//           errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
//           resetTimeout: 1000 // After 30 seconds, try again.
//         },
//         fallback: () => {
//           return 'Sorry, out of service right now';
//         },
//         events: {
//           onFire: result => emitter.emit('event', 'fire'),
//           onReject: result => emitter.emit('event', 'reject'),
//           onTimeout: result => emitter.emit('event', 'timeout'),
//           onSuccess: result => emitter.emit('event', 'success'),
//           onFailure: result => emitter.emit('event', 'failure'),
//           onOpen: result => emitter.emit('event', 'open'),
//           onClose: result => emitter.emit('event', 'close'),
//           onHalfOpen: result => emitter.emit('event', 'halfOpen'),
//           onFallback: result => emitter.emit('event', 'fallback'),
//           onSemaphoreLocked: result => emitter.emit('event', 'semaphoreLocked'),
//           onHealthCheckFailed: result => emitter.emit('event', 'healthCheckFailed')
//         }
//       }
//     };

//     const mockService = CircuitBreaker(Service, { delay: 10 }, options);

//     app.use('/adapter', mockService);
//   });

//   it('faster than timeout', async () => {
//     const result = await app.service('adapter').get(1, { name: 'John' });
//     assert.strictEqual(result.id, 1, 'Id is is');
//   });

//   it('slower than timeout expect fallback', async () => {
//     const result = await app.service('adapter').get(200, { name: 'John' });
//     assert.strictEqual(result, 'Sorry, out of service right now', 'Sorry, out of service right now');
//   });

//   it('wait - is closed', async () => {
//     const timeout = async delay => {
//       return new Promise(resolve => setTimeout(resolve, delay));
//     };
//     await timeout(1200);
//     const result = await app.service('adapter').get(20, { name: 'John' });
//     assert.strictEqual(result.id, 1, 'Id is is');
//   });

//   it('event fallback', done => {
//     emitter.on('event', msg => {
//       if (msg === 'fallback') done();
//     });
//     app
//       .service('adapter')
//       .get(120, { name: 'John' })
//       .catch(res => {});
//   });
// });
