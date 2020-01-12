const assert = require('assert');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');
const { adapter } = require('../lib');

const app = feathers();

const CircuitBreaker = require('opossum');
const timeout = async delay => {
  return new Promise(resolve => setTimeout(resolve, delay));
};
class MockService {
  constructor(options = {}) {
    this.name = 'test';
    this.delay = options.delay || 1000;
  }

  async get(id, params) {
    await timeout(this.delay);
    return { id: 1, name: 'john' };
  }
  async find(params) {
    await timeout(this.delay);
    return [{ id: 1, name: 'john' }];
  }
}

const Service = { Service: MockService };

describe('Feathers Opossum Tests', () => {
  before(async () => {
    // app.use('/fast', new MockService({ delay: 500 }));
    // app.use('/slow', new MockService({ delay: 1000 }));
    const options = {
      timeout: 200, // If our function takes longer than 3 seconds, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 30000 // After 30 seconds, try again.
    };
    console.log(Service);
    const serviceOP = adapter(Service, { delay: 100 }, options);
    app.use('/adapter', serviceOP);
  });

  after(async () => {});

  it('adapter class', async () => {
    // assert.strictEqual(typeof app.service('adapter').get, 'function', 'Error', 'Got not a response status');
    // assert.strictEqual(typeof serviceOP.find, 'function', 'Error', 'Got not a response status');
    // assert.strictEqual(typeof serviceOP.patch, 'function', 'Error', 'Got not a response status');
    // assert.strictEqual(typeof serviceOP.update, 'function', 'Error', 'Got not a response status');
    // assert.strictEqual(typeof serviceOP.remove, 'function', 'Error', 'Got not a response status');
  });

  // it('adapter methods.get', async () => {
  //   const result = await app.service('adapter').get(1, { name: 'John' });
  //   console.log('.get', result);
  //   assert.ok(1);
  // });

  it('adapter methods.find', async () => {
    const result = await app.service('adapter').find({ id: 1, name: 'John' });
    // console.log('.find', result);
    assert.ok(1);
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
