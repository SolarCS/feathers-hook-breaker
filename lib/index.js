const CircuitBreaker = require('opossum');
module.exports = OpossumService = (ServiceClass, serviceOptions, opossumOptions) => {
  class OpossumService extends ServiceClass.Service {
    constructor(serviceOptions, options) {
      super(serviceOptions);
      this.init(options);
    }

    init(options) {
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

      return async (...params) => {
        // if (typeof options.fallback === 'function') breaker.fallback(options.fallback);
        // if (typeof options.onFallback === 'function') breaker.on('fallback', result => options.onFallback);
        const result = await breaker.fire(params);
        return result;
      };
    }

    circuitBreakerOptions(method, options) {
      return {
        opossum: options.opossum || options[method].opossum || {},
        fallback: options.fallback || options[method].fallback || false,
        onFallback: options.onFallback || options[method].onFallback || false
      };
    }
  }

  return new OpossumService(serviceOptions, opossumOptions);
};
