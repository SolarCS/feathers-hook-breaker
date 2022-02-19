/* eslint-disable no-unused-vars */
const CircuitBreaker = require('opossum');
const { CircuitBreakerError  }= require('./breaker');

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
  ...singleFailureSettings
};

/**
 * Allows standard hook flow to modify the functions, events, and fallbacks for the breaker at runtime.
 * @param {object} options 
 * @returns Feathers Context
 */
const beforeBreakerHook = (options)=> async (ctx)=>{
  ctx.params = {
    ...ctx.params,
    breakerOptions: {
      ...baseOptions, // defaults
      ...options, // passed in via the before hook
      ...ctx.params.breakerOptions //set in the service call
    }
  };
  return ctx;
};
  
/**
 * Simple helper function for feathers conditionals (i.e. iff, unless, etc.)
 * @param {object} ctx 
 * @returns 
 */
const isOurError = (ctx)=>{
  return CircuitBreaker.isOurError(ctx.error);
};
  
  
/**
 * Required to trigger fallback function as part of feathers hooks flow.  
 * onFallback may be modified after the failure as well. 
 * @param {object} options 
 * @returns 
 */
const errorBreakerHook = (options)=> async (ctx)=>{
  
  // console.log('in the error', ctx.error);
  // if(ctx.params.breakerOptions.onFallback){
  //   await ctx.params.breakerOptions.onFallback.call(this,ctx);
  // }
  if(isOurError(ctx)){
    ctx.error = new CircuitBreakerError();
  }
  return ctx;
};

module.exports = {
  beforeBreakerHook,
  errorBreakerHook,
  isOurError
};