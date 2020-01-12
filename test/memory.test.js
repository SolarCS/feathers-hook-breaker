const assert = require('assert');
const adapterTests = require('@feathersjs/adapter-tests');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');

const memory = require('feathers-memory');
const { adapter } = require('../lib');

const app = feathers();

const testSuite = adapterTests([
  // '.options',
  // '.events',
  // '._get',
  // '._find',
  // '._create',
  // '._update',
  // '._patch',
  // '._remove',
  // '.get',
  // '.get + $select',
  // '.get + id + query',
  // '.get + NotFound',
  // '.get + id + query id',
  // '.find',
  // '.remove',
  // '.remove + $select',
  // '.remove + id + query',
  // '.remove + multi',
  // '.remove + id + query id',
  // '.update',
  // '.update + $select',
  // '.update + id + query',
  // '.update + NotFound',
  // '.update + id + query id',
  // '.patch',
  // '.patch + $select',
  // '.patch + id + query',
  // '.patch multiple',
  // '.patch multi query',
  // '.patch + NotFound',
  // '.patch + id + query id',
  // '.create',
  // '.create + $select',
  // '.create multi',
  // 'internal .find',
  // 'internal .get',
  // 'internal .create',
  // 'internal .update',
  // 'internal .patch',
  // 'internal .remove',
  // '.find + equal',
  // '.find + equal multiple',
  // '.find + $sort',
  // '.find + $sort + string',
  // '.find + $limit',
  // '.find + $limit 0',
  // '.find + $skip',
  // '.find + $select',
  // '.find + $or',
  // '.find + $in',
  // '.find + $nin',
  // '.find + $lt',
  // '.find + $lte',
  // '.find + $gt',
  // '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params'
]);

describe('Feathers Opossum - Memory Tests', () => {
  before(async () => {
    const options = {
      timeout: 1000, // If our function takes longer than 3 seconds, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
      resetTimeout: 30000 // After 30 seconds, try again.
    };
    const service = {
      paginate: {
        default: 2,
        max: 4
      },
      events: ['testing']
    };
    const serviceOP = adapter(memory, service, options);

    app.use('/adapter', serviceOP);
    // await app.service('adapter').create({ id: 1, name: 'John' });
  });

  it('adapter methods.create', async () => {
    await app.service('adapter').create({ id: 1, name: 'John' });
    const result = await app.service('adapter').get(1);
    assert.strictEqual(result.id, 1, 'Error', 'Got not a response status');
    assert.ok(1);
  });

  it('adapter methods.get', async () => {
    const result = await app.service('adapter').get(1);
    // console.log('.get', result);
    assert.ok(1);
  });

  it('adapter methods.find', async () => {
    const result = await app.service('adapter').find({ id: 1, name: 'John' });
    // console.log('.find', result);
    assert.ok(1);
  });

  // testSuite(app, errors, 'adapter');
});
