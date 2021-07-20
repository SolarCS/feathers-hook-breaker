const CircuitBreaker = require('opossum');

global.breakers = {};

// These settings are configured to trip the breaker after the first failure,
// rather than a percentage of failures - tuned for < 10000rps
const singleFailureSettings = {
  rollingCountTimeout: 10, // listens for failures for 10ms
  rollingCountBuckets: 1, // tracks failures for the entire 10ms block
  errorThresholdPercentage: 1 // breaker trips if greater than 1/100 attempts within 10ms fail
};

// These are the default breaker settings, configured to open after a single failure
const baseOptions = {
  timeout: 3000,
  resetTimeout: 10000,
  fallback: () => {
    console.log('Default fallback function executed.');
  },
  ...singleFailureSettings
};

// This function adds any event listeners to the breaker, by searching options
// for each of the baseEvents prefixed with 'on' (ex: 'onReject'). if found, it
// assigns the options[onSomeEvent] function to the event.
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

// this is the breaker itself
module.exports = (options = {}) => async ctx => {
  const service = ctx.path;
  const method = ctx.method;

  // this is the function called when breaker.fire calls. it finds the
  // matching hookless function based on ctx.method, and calls that instead
  const methodOverride = async ({ id, data, params }) => {
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

  // this function retrieves an existing circuit breaker and re-assigns its
  // .fire function (action), or creates a new breaker and assigns any event listeners to it
  const retrieveBreaker = (circuitOwner, passedOptions = {}) => {
    let breaker = global.breakers[`${circuitOwner}`];

    if (breaker) {
      // reassign .fire function to methodOverride using current ctx
      breaker.action = methodOverride;
    } else {
      global.breakers[`${circuitOwner}`] = new CircuitBreaker(methodOverride, { ...baseOptions, ...passedOptions });

      breaker = global.breakers[`${circuitOwner}`];

      addEventListeners(breaker, passedOptions);
    }

    return breaker;
  };

  // assign (or find) the circuit breaker with the service name
  // if present, append service with '|' + options.circuitOwner
  // for method-specific (or more) circuit breakers
  const circuitOwner = options.circuitOwner
    ? [service, options.circuitOwner].join('|')
    : service;

  const breaker = retrieveBreaker(circuitOwner, options);

  // the breaker.fallback call assigns the callback function to be executed if
  // the breaker is open or if the wrapped method call fails.
  // openBeforeCall determines the state of the breaker before the wrapped
  // method was called, so that the fallback can determine it was called because
  // of an open breaker (openBeforeCall == true)
  // or a failed attempt (openBeforeCall == false)
  const openBeforeCall = breaker.opened;
  breaker.fallback(() => options.fallback(openBeforeCall));

  // the below logic is the actual method call. breaker.fire executes the wrapped function
  // passing the arguments from ctx. it then assigns the response to ctx.result.
  // any errors filtered out by breaker.options.errorFilter (that won't trip the breaker)
  // are thrown futher through the application
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
