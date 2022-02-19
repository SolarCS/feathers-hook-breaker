/* eslint-disable no-unused-vars */

const CircuitBreaker = require('opossum');
const { FeathersError } = require('@feathersjs/errors');
const {  AdapterService } = require('@feathersjs/adapter-commons');


// this is ugly - should be tucked in the feathers app
global.breakers = {};

class CircuitBreakerError extends FeathersError {
  constructor(message, data) {
    super(message,  'CircuitBreakerError', 503, 'circuit-breaker-error', data);
  }
}

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

const resolveName = (method, options={})=>{
  if(typeof options.name === 'function'){
    return options.name();
  }else if (typeof options.name === 'string'){
    return `${options.name}`;
  }else{
    return `default_${method}`;
  }
};

function nameFunction(name, body) {
  return {[name](...args) {return body(...args);}}[name];
}


// Modifies the result package to throw a certain error and store the other error for later.
const defaultFallback = (...args)=>{
  let [e] = args.slice(-1);
  if(e instanceof Error){
    if(CircuitBreaker.isOurError(e)){
      e = new CircuitBreakerError('Breaker is Open');
    }
    throw e;
  }
};

function attachBreaker(superMethod,methodName){
  return (...args)=>{
    let [params] = args.slice(-1); //assumes params is always the last argument
    let options = Object.assign((params||{}).breakerOptions || {});
    let name = resolveName(methodName, options);
    // console.log('using breaker named ',name);
    let breaker = global.breakers[name];
    if(!breaker) {
      breaker = global.breakers[name] = new CircuitBreaker(superMethod, options);
      breaker.fallback(defaultFallback);
      addEventListeners(breaker, options);
    }
    return breaker.fire(args);
  };
}

const breakerWrapper = ( ServiceClass, serviceOptions, allowedMethods = ['create','get','find','update','patch','remove']) => {
  if(ServiceClass.Service){
    class newWrapperService extends ServiceClass.Service {
      constructor(serviceOptions) {
        super(serviceOptions);
        this.addBreaker(allowedMethods);
      }
      bindSuper(methodName){
        return (serviceParams)=>super[methodName](...serviceParams);
      }
      addBreaker(methods){
        methods.forEach(methodName=>{
          // attach a method
          this[methodName] = attachBreaker(this.bindSuper(methodName),methodName);

          /*
          this[methodName] = 
          (...args) => {
            console.log('\n\n****************** INTERNAL');
            console.log('super[methodName]',super[methodName]);
            console.log('self.__proto__',self.__proto__);
            console.log('this',this);
            console.log('****   ', methodName);
            let [params] = args.slice(-1); //assumes params is always the last argument
            let options = Object.assign((params||{}).breakerOptions || {});
            let name = resolveName(methodName, options);
            console.log('using breaker named ',name);
            let breaker = global.breakers[name];
            if(!breaker) {
              breaker = global.breakers[name] = new CircuitBreaker(serviceParams => super[methodName](...serviceParams), {});
              breaker.fallback(defaultFallback);
              addEventListeners(breaker, options);
            }
            return breaker.fire(args);
          };
          */

        });
      }
    }
    return new newWrapperService(serviceOptions);
  }else{

    // For pure Object and Class services that aren't children of AdapterService
    let Wrapper;
    let Service;
    if(typeof ServiceClass === 'function'){
      Wrapper = new ServiceClass();
      Service = ServiceClass.prototype;
    }else{
      Wrapper = Object.assign({},ServiceClass);
      Service = ServiceClass;
    }
    const implementedMethods = Object.getOwnPropertyNames(Service);
    
    if(allowedMethods.length==0){
      throw new Error('Breaker allowedMethod list cannot be empty.');
    }
    // get intersection of implemented and allowed
    const filteredMethods = allowedMethods.filter(value => implementedMethods.includes(value));
    if(filteredMethods.length==0){
      throw new Error('Breaker Class must have one allowed method.');
    }

    // only modify the implemented 
    filteredMethods.forEach(methodName=>{
      Wrapper[methodName] = nameFunction(
        `breaker_${methodName}`,
        attachBreaker(
          (args)=>Service[methodName](...args),
          methodName
        )
      );
    });
    return Wrapper;
  }
  /*
    generic classes will always have .prototype
    generic classes will always have .prototype.constructor pointing to origin function
    instances will always have a __proto__ pointing to the parent .prototype
    __proto__is the deprecated version of Object.getPrototypeOf(obj)

    we want classes WITHOUT __proto__
    */
};

module.exports = {
  attachBreaker,
  breakerWrapper,
  CircuitBreakerError,
};