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
        const methodName = super[`_${method}`] ? `_${method}` : method;
        this[methodName] = this.addCircuitBreaker(methodName, this.circuitBreakerOptions(method, options));
      });
    }

    addCircuitBreaker(methodName, options) {
      const breaker = new CircuitBreaker(
        params => {
          return super[methodName](...params);
        },
        Object.assign(
          {
            timeout: 3000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
          },
          options.opossum
        )
      );

      if (typeof options.fallback === 'function') breaker.fallback(options.fallback);
      Object.keys(options.events).forEach(e => {
        breaker.on(e, options.events[e]);
      });

      return async (...params) => {
        const result = await breaker.fire(params);
        return result;
      };
    }

    circuitBreakerOptions(method, options) {
      const opt = options[method] || options;
      return {
        opossum: opt.opossum || {},
        fallback: opt.fallback || false,
        events: opt.events || {}
      };
    }
  }

  return new OpossumService(serviceOptions, opossumOptions);
};
