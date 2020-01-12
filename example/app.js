const feathers = require('@feathersjs/feathers');
const MockService = require('../test/service/mock');
const OpossumService = require('../lib');

const app = feathers();

const options = {
  opossum: {
    timeout: 200, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 30000 // After 30 seconds, try again.
  },
  fallback: () => {
    errro: 'Sorry, out of service right now';
  },
  onFallback: result => reportFallbackEvent(result),
  // this means only find and get method relay on circur breaking
  methods: ['find', 'get'] // feel free to use updat, patch amd remove
};
const circuitedService = OpossumService(MockService, { id: '_id', paginate: { max: 10 } }, options);

app.use('/may-fail', circuitedService);

app
  .service('todos')
  .find({ delay: 100 })
  .then(res => console.log(res))
  .catch(err => console.log(err));
console.log('end');
