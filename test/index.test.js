const assert = require('assert');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');
const { adapter } = require('../lib');
const Service = require('./mockservice');
const app = feathers();

describe('Feathers Opossum Tests', () => {
  before(async () => {
    const options = {
      timeout: 200, // If our function takes longer than 3 seconds, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 3000 // After 30 seconds, try again.
    };
    const mockService = adapter(Service, { delay: 100 }, options);
    app.use('/adapter', mockService);
  });

  after(async () => {});

  it('adapter class methods', async () => {
    assert.strictEqual(typeof app.service('adapter').get, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').find, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').update, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').patch, 'function', 'Error', 'Got not a response status');
    assert.strictEqual(typeof app.service('adapter').remove, 'function', 'Error', 'Got not a response status');
  });

  it('faster than timeout', async () => {
    const result = await app.service('adapter').get(1, { name: 'John' });
    assert.strictEqual(result.id, 1, `Timed out after 200ms`);
  });

  it('slower than timeout first timeout', async () => {
    try {
      await app.service('adapter').get(500);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Timed out after 200ms`);
    }
  });

  it('slower than timeout second timeout', async () => {
    try {
      await app.service('adapter').get(500);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Timed out after 200ms`);
    }
  });

  it('slower than timeout third - breaker is open', async () => {
    try {
      await app.service('adapter').get(500);
      throw new Error('Should never get here');
    } catch (error) {
      assert.strictEqual(error.message, `Breaker is open`);
    }
  });

  it('wait - breaker is closed', async () => {
    const timeout = async delay => {
      return new Promise(resolve => setTimeout(resolve, delay));
    };
    await timeout(4000);
    const result = await app.service('adapter').get(1);
    assert.strictEqual(result.id, 1, `Result ok`);
  });

  // it('.find slow', async () => {
  //   const result = await app.service('fast').find();
  //   // console.log(result, '?');
  //   assert.ok(1);
  // });

  // it('.find fast', async () => {
  //   const options = {
  //     timeout: 500, // If our function takes longer than 3 seconds, trigger a failure
  //     errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  //     resetTimeout: 30000 // After 30 seconds, try again.
  //   };
  //   const breaker = new CircuitBreaker(app.service('slow').find(), options);
  //   breaker.fallback(() => 'Sorry, out of service right now');
  //   breaker.on('fallback', result => console.log(result, 'emited'));
  //   const result = await breaker.fire({});
  //   console.log(result, '?');
  //   assert.ok(1);
  // });

  // it('adapter inline', async () => {
  //   const options = {
  //     timeout: 500, // If our function takes longer than 3 seconds, trigger a failure
  //     errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  //     resetTimeout: 30000 // After 30 seconds, try again.
  //   };
  //   const VarClass = MockService;
  //   class OpossumService extends VarClass {
  //     constructor(serviceOptions, options) {
  //       super(options);
  //       this.options = serviceOptions;
  //     }
  //   }
  //   const t = new OpossumService({}, { delay: 500 });
  //   console.log(t, 't?');
  //   console.log(t.find, 't?');
  //   assert.ok(1);
  // });
});
