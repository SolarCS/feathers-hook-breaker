const feathers = require('@feathersjs/feathers');
const { breakerWrapper, beforeBreakerHook, errorBreakerHook } = require('../../lib');

const defaultOptions = exports.defaultOptions = {
  rollingCountTimeout: 10, // listens for failures for 10ms
  rollingCountBuckets: 1, // tracks failures for the entire 10ms block
  errorThresholdPercentage: 1, // breaker trips if greater than 1/100 attempts within 10ms fail
  // name: ((...args)=>{
  //   let r = (Math.random() + 1).toString(36).substring(7);
  //   console.log('name is made: ',r);
  //   return r;
  // })(),
  query: { yes: false }
};

exports.defaultParams = {
  breakerOptions: defaultOptions
};

exports.appFactory = function (name, ServiceClass, serviceOptions = {}, allowedMethods = [], hooks) {
  const app = feathers();
  const service = breakerWrapper(
    ServiceClass,
    serviceOptions,
    allowedMethods
  );
  app.use(`/${name}`, service);
  app.service(name).hooks(hooks || { before: { all: [beforeBreakerHook()] }, error: { all: [errorBreakerHook()] } });
  return app.service(name);
};
