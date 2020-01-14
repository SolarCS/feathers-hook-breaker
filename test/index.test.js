const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const feathers = require('@feathersjs/feathers');
const OpossumService = require('../lib');
const Service = require('./service/mock');
const app = feathers();

describe('Feathers Opossum Tests Methods', () => {
  before(async () => {
    const options = {
      opossum: {
        timeout: 200, // If our function takes longer than 3 seconds, trigger a failure
        errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
        resetTimeout: 3000 // After 30 seconds, try again.
      }
    };
    const mockService = OpossumService(Service, { delay: 100 }, options);
    app.use('/adapter', mockService);
  });

  it('adapter class methods', async () => {
    assert.strictEqual(typeof app.service('adapter').get, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').find, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').update, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').patch, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').remove, 'function', 'Error', 'Got not a response status');
  });
});

describe('Feathers Opossum Tests Simple Configuration', () => {
  before(async () => {
    const options = {
      opossum: {
        timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
        errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
        resetTimeout: 1000 // After 30 seconds, try again.
      },
      // this means only find and get method relay on circur breaking
      methods: ['find', 'get']
    };

    const mockService = OpossumService(Service, { delay: 10 }, options);

    app.use('/adapter', mockService);
  });

  it('faster than timeout', async () => {
    const result = await app.service('adapter').get(1, { name: 'John' });
    assert.strictEqual(result.id, 1, `Timed out after 100ms`);
  });

  it('slower than timeout first timeout', async () => {
    try {
      await app.service('adapter').get(200);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Timed out after 100ms`);
    }
  });

  it('slower than timeout second timeout', async () => {
    try {
      await app.service('adapter').get(200);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Timed out after 100ms`);
    }
  });

  it('slower than timeout third - breaker is open', async () => {
    try {
      await app.service('adapter').get(200);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Breaker is open`);
    }
  });

  it('wait - breaker is closed', async () => {
    const timeout = async delay => {
      return new Promise(resolve => setTimeout(resolve, delay));
    };
    await timeout(1200);
    const result = await app.service('adapter').get(1);
    assert.strictEqual(result.id, 1, `Result ok`);
  });
});

describe('Feathers Opossum Tests Structured Configuration', () => {
  before(async () => {
    const options = {
      find: {
        opossum: {
          timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
          errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
          resetTimeout: 1000 // After 30 seconds, try again.
        }
      },
      get: {
        opossum: {
          timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
          errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
          resetTimeout: 1000 // After 30 seconds, try again.
        }
      }
    };

    const mockService = OpossumService(Service, { delay: 10 }, options);

    app.use('/adapter', mockService);
  });

  it('faster than timeout', async () => {
    const result = await app.service('adapter').get(1, { name: 'John' });
    assert.strictEqual(result.id, 1, `Timed out after 200ms`);
  });

  it('slower than timeout first timeout', async () => {
    try {
      await app.service('adapter').get(200);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Timed out after 100ms`);
    }
  });

  it('slower than timeout second timeout', async () => {
    try {
      await app.service('adapter').get(200);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Timed out after 100ms`);
    }
  });

  it('slower than timeout third - breaker is open', async () => {
    try {
      await app.service('adapter').get(200);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Breaker is open`);
    }
  });

  it('wait - breaker is closed', async () => {
    const timeout = async delay => {
      return new Promise(resolve => setTimeout(resolve, delay));
    };
    await timeout(1200);
    const result = await app.service('adapter').get(1);
    assert.strictEqual(result.id, 1, `Result ok`);
  });
});

describe('Feathers Opossum Tests Fallback', () => {
  const emitter = new EventEmitter();
  before(async () => {
    const options = {
      get: {
        opossum: {
          timeout: 100, // If our function takes longer than 3 seconds, trigger a failure
          errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
          resetTimeout: 1000 // After 30 seconds, try again.
        },
        fallback: () => {
          return 'Sorry, out of service right now';
        },
        events: {
          fire: result => emitter.emit('event', 'fire'),
          reject: result => emitter.emit('event', 'reject'),
          timeout: result => emitter.emit('event', 'timeout'),
          success: result => emitter.emit('event', 'success'),
          failure: result => emitter.emit('event', 'failure'),
          open: result => emitter.emit('event', 'open'),
          close: result => emitter.emit('event', 'close'),
          halfOpen: result => emitter.emit('event', 'halfOpen'),
          fallback: result => emitter.emit('event', 'fallback'),
          semaphoreLocked: result => emitter.emit('event', 'semaphoreLocked'),
          healthCheckFailed: result => emitter.emit('event', 'healthCheckFailed')
        }
      }
    };

    const mockService = OpossumService(Service, { delay: 10 }, options);

    app.use('/adapter', mockService);
  });

  it('faster than timeout', async () => {
    const result = await app.service('adapter').get(1, { name: 'John' });
    assert.strictEqual(result.id, 1, `Id is is`);
  });

  it('slower than timeout expect fallback', async () => {
    const result = await app.service('adapter').get(200, { name: 'John' });
    assert.strictEqual(result, 'Sorry, out of service right now', `Sorry, out of service right now`);
  });

  it('wait - is closed', async () => {
    const timeout = async delay => {
      return new Promise(resolve => setTimeout(resolve, delay));
    };
    await timeout(1200);
    const result = await app.service('adapter').get(20, { name: 'John' });
    assert.strictEqual(result.id, 1, `Id is is`);
  });

  it('event fallback', done => {
    emitter.on('event', msg => {
      if (msg == 'fallback') done();
    });
    app
      .service('adapter')
      .get(120, { name: 'John' })
      .catch(res => {});
  });
});
