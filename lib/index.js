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
        const methodOpts = options[method] || options;
        const { methodName, opossum, fallback, events } = this.circuitBreakerOptions(method, methodOpts);

        this[methodName] = this.addCircuitBreaker(methodName, opossum, fallback, events);
      });
    }

    addCircuitBreaker(methodName, opossum, fallback, events) {
      const breaker = new CircuitBreaker(params => super[methodName](...params), opossum);

      if (typeof fallback === 'function') breaker.fallback(fallback);

      Object.keys(events).forEach(e => {
        breaker.on(e, events[e]);
      });

      return (...params) => breaker.fire(params);
    }

    circuitBreakerOptions(method, options) {
      return {
        methodName: super[`_${method}`] ? `_${method}` : method,
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
      };
    }
  }

  return new OpossumService(serviceOptions, opossumOptions);
};
