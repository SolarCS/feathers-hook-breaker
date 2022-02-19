/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */

const CircuitBreaker = require('opossum');
const { FeathersError } = require('@feathersjs/errors');

// this is ugly - should be tucked in the feathers app
global.breakers = {};

const CircuitBreakerError = exports.CircuitBreakerError = class CircuitBreakerError extends FeathersError {
  constructor (message, data) {
    super(message, 'CircuitBreakerError', 503, 'circuit-breaker-error', data);
  }
};

// This function adds any event listeners to the breaker, by searching options
// for each of the baseEvents prefixed with 'on' (ex: 'onReject'). if found, it
// assigns the options[onSomeEvent] function to the event.
const addEventListeners = exports.addEventListeners = (breaker, options = {}) => {
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
    // 'fallback',
    'failure'
  ];

  baseEvents.forEach(event => {
    const eventListener = 'on' + event.charAt(0).toUpperCase() + event.slice(1);
    if (options[`${eventListener}`] && typeof options[`${eventListener}`] === 'function') {
      breaker.on(event, options[`${eventListener}`]);
    }
  });
};

const resolveName = exports.resolveName = (method, options = {}) => {
  if (typeof options.name === 'function') {
    return options.name();
  } else if (typeof options.name === 'string') {
    return `${options.name}`;
  } else {
    return `default_${method}`;
  }
};

// Modifies the result package to throw a certain error and store the other error for later.
const defaultFallback = exports.defaultFallback = (...args) => {
  let [e] = args.slice(-1);
  if (e instanceof Error) {
    const underlying = Object.assign(e);
    if (CircuitBreaker.isOurError(e)) {
      e = new CircuitBreakerError('Breaker is Open');
      e.underlying = underlying;
    }
    throw e;
  }
};

// Fetches the appropriate breaker from globals and attaches that one to the method;
const attachBreaker = exports.attachBreaker = function (superMethod, methodName, defaultOptions = {}) {
  return (...args) => {
    // resolve options
    const [params] = args.slice(-1); // assumes params is always the last argument
    const options = Object.assign((params || {}).breakerOptions || defaultOptions); // defaults to options passed in during Service Class creation
    const name = resolveName(methodName, options);

    // store name for later, params is object by reference
    (params.breakerOptions || {}).resolvedName = name;

    // set breaker from memory
    let breaker = global.breakers[name];
    if (!breaker) {
      breaker = global.breakers[name] = new CircuitBreaker(superMethod, options);
      breaker.fallback(defaultFallback);
      addEventListeners(breaker, options);
    }

    return breaker.fire(args);
  };
};

const buildSuperClass = exports.buildSuperClass = (ServiceClass) => {
  let SuperClass;
  if (ServiceClass.Service) { // adapter based Service
    SuperClass = ServiceClass.Service;
  } else if (!ServiceClass.prototype) { // object based Service
    class Service {}
    Object.assign(Service.prototype, ServiceClass);
    SuperClass = Service;
  } else { // class based Service
    SuperClass = ServiceClass;
  }
  return SuperClass;
};

const breakerWrapper = exports.breakerWrapper = (
  ServiceClass,
  serviceOptions,
  allowedMethods = ['create', 'get', 'find', 'update', 'patch', 'remove'],
  defaultBreakerOptions = {}
) => {
  // transform all types of service inputs to a Class structure so that it can be extended
  const SuperClass = buildSuperClass(ServiceClass);

  // Create a new child class from the Service and replace the appropriate methods with a CB attached version
  class BreakerService extends SuperClass {
    constructor (serviceOptions) {
      super(serviceOptions);
      this.addBreaker(allowedMethods.filter(a => !!this[a]));
    }

    bindSuper (methodName) {
      return (serviceParams) => super[methodName](...serviceParams);
    }

    nameFunction (name, body) {
      return { [name] (...args) { return body(...args); } }[name];
    }

    addBreaker (methods) {
      methods.forEach(methodName => {
        // methodName = super[`_${methodName}`] ? `_${methodName}` : methodName,
        this[methodName] = this.nameFunction(
          `breaker_${methodName}`,
          attachBreaker(this.bindSuper(methodName), methodName, defaultBreakerOptions)
        );
      });
    }
  }
  return new BreakerService(serviceOptions);
};
