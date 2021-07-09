const CircuitBreaker = require('opossum');

global.breakers = {};

// These settings are configured to trip the breaker after the first failure,
// rather than a percentage of failures - tuned for < 10000rps
const singleFailureSettings = {
  rollingCountTimeout: 10, // listens for failures for 10ms
  rollingCountBuckets: 1, // tracks failures for the entire 10ms block
  errorThresholdPercentage: 1 // breaker trips if greater than 1/100 attempts within 10ms fail
};

const baseOptions = {
  timeout: 3000,
  resetTimeout: 10000,
  fallback: () => {
    console.log('Default fallback function executed.')
  },
  ...singleFailureSettings
};

const addEventListeners = (breaker, options = {}) => {
  const baseEvents = [
    'halfOpen',
    'close',
    'open',
    'shutdown',
    'fire',
    'cacheHit',
    'cacheMiss',
    'reject',
    'timeout',
    'success',
    'semaphoreLocked',
    'healthCheckFailed',
    'fallback',
    'failure'
  ];

  baseEvents.forEach(event => {
    const eventListener = 'on' + event.charAt(0).toUpperCase() + event.slice(1);

    if (options[`${eventListener}`]) {
      breaker.on(event, options[`${eventListener}`]);
    }
  });
};

module.exports = (options = {}) => async ctx => {
  const service = ctx.path;
  const method = ctx.method;
  // console.log('IN-FUNCTION CONTEXT', ctx);
  const methodOverride = async ({ id, data, params }) => {
    // console.log('IN-BROKEN_FUNCTION CONTEXT', ctx);
    const hooklessFunctions = {
      find: async ({ params }) => ctx.app.service(service)._find(params),
      get: async ({ id, params }) => ctx.app.service(service)._get(id, params),
      create: async ({ data, params }) => ctx.app.service(service)._create(data, params),
      update: async ({ id, data, params }) => ctx.app.service(service)._update(id, data, params),
      patch: async ({ id, data, params }) => ctx.app.service(service)._patch(id, data, params),
      remove: async ({ id, params }) => ctx.app.service(service)._remove(id, params)
    };

    return hooklessFunctions[`${method}`]({ id, data, params });
  };

  const retrieveBreaker = (circuitOwner, passedOptions = {}) => {
    let breaker = global.breakers[`${circuitOwner}`];

    if (breaker) {
      breaker.action = methodOverride;
    } else {
      global.breakers[`${circuitOwner}`] = new CircuitBreaker(methodOverride, { ...baseOptions, ...passedOptions });

      breaker = global.breakers[`${circuitOwner}`];

      addEventListeners(breaker, passedOptions);
    }

    return breaker;
  };

  const circuitOwner = options.circuitOwner
    ? [service, options.circuitOwner].join('|')
    : service;

  const breaker = retrieveBreaker(circuitOwner, options);

  const openBeforeCall = breaker.opened;
  breaker.fallback(() => options.fallback(openBeforeCall));

  ctx.result = await breaker.fire({ id: ctx.id, data: ctx.data, params: ctx.params })
    .catch(e => {
      console.log(
        'Non-\'failure\' Error Caught by Circuit Breaker: ',
        e.code + ' - ' + e.message
      );

      throw e;
    });

  // console.log(`${breaker.name} stats: \n  current state: ${breaker.opened ? 'open' : 'closed'}\n  failures: ${breaker.stats.failures}\n  fallbacks: ${breaker.stats.fallbacks}\n  rejects: ${breaker.stats.rejects}\n successes: ${breaker.stats.successes}\n`);
  return ctx;
};
