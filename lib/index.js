const CircuitBreaker = require('opossum');
const OpossumService = (ServiceClass, serviceOptions, opossumOptions) => {
  class OpossumService extends ServiceClass.Service {
    constructor(options, opossumOptions) {
      super(options);

      const methods = opossumOptions.methods || ['get', 'find'];

      methods.forEach(method => {
        const methodName = super['_' + method] ? '_' + method : method;
        this[methodName] = this._opossum(methodName, opossumOptions);
      });
    }
    _opossum(methodName, opossumOptions) {
      let breaker = new CircuitBreaker(params => {
        return super[methodName](...params);
      }, opossumOptions);

      return async (...params) => {
        // breaker.fallback(() => 'Sorry, out of service right now');
        // breaker.on('fallback', result => console.log('Opossum.on fallback: ', result));
        let result = await breaker.fire(params);
        return result;
      };
    }
  }
  return new OpossumService(serviceOptions, opossumOptions);
};

module.exports = {
  adapter: OpossumService
};
