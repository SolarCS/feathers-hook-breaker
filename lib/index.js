const CircuitBreaker = require('opossum');
const OpossumService = (ServiceClass, serviceOptions, opossumOptions) => {
  class OpossumService extends ServiceClass.Service {
    constructor(options, opossumOptions) {
      super(options);
      const methods = options.methods || ['find', 'get'];

      methods.forEach(methodName => {
        this[methodName] = this._opossum(methodName, opossumOptions);
      });
    }
    _opossum(method, opossumOptions) {
      const methodName = super['_' + method] ? '_' + method : method;
      let breaker = new CircuitBreaker(params => super[methodName](params), opossumOptions);
      return async params => {
        // return super[method](params);
        breaker.fallback(() => 'Sorry, out of service right now');
        breaker.on('fallback', result => console.log('Opossum.on fallback: ', result));
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
