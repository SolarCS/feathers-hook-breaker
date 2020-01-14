const CircuitBreaker = require('opossum');
module.exports = OpossumService = (ServiceClass, serviceOptions, opossumOptions) => {
  class OpossumService extends ServiceClass.Service {
    constructor(serviceOptions, options) {
      super(serviceOptions);

      this.initCircuitBreaker(options);
    }

    initCircuitBreaker(options) {
      const methods = Array.isArray(options.methods) ? options.methods : Object.keys(options);
      methods.forEach(method => {
        const { methodName, opts } = this.circuitBreakerOptions(method, options[method] || options);
        this[methodName] = this.addCircuitBreaker(methodName, opts);
      });
    }

    addCircuitBreaker(methodName, options) {
      const breaker = new CircuitBreaker(params => super[methodName](...params), options.opossum);

      if (typeof options.fallback === 'function') breaker.fallback(options.fallback);

      Object.keys(options.events).forEach(e => {
        breaker.on(e, options.events[e]);
      });

      return async (...params) => breaker.fire(params);
    }

    circuitBreakerOptions(method, options) {
      return {
        methodName: super[`_${method}`] ? `_${method}` : method,
        opts: {
          opossum: Object.assign(
            {
              timeout: 3000,
              errorThresholdPercentage: 50,
              resetTimeout: 30000
            },
            options.opossum || {}
          ),
          fallback: options.fallback || false,
          events: options.events || {}
        }
      };
    }
  }

  return new OpossumService(serviceOptions, opossumOptions);
};
