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
  let configOptions = ctx.app.get('breaker') || {};
  ctx.params = {
    ...ctx.params,
    breakerOptions: {
      ...baseOptions, // defaults
      ...configOptions,
      ...options, // passed in via the before hook
      ...ctx.params.breakerOptions //set in the service call
    }
  };
  ctx.params.breakerOptions.name = ctx.params.breakerOptions.name(ctx);
  return ctx;
};
  
/**
 * Simple helper function for feathers conditionals (i.e. iff, unless, etc.)
 * @param {object} ctx 
 * @returns 
 */
const isBreakerError = (ctx)=>{
  return ctx.error && ctx.error.className && ctx.error.className == 'circuit-breaker-error';
};
  
  
/**
 * Required to trigger fallback function as part of feathers hooks flow.  
 * onFallback may be modified after the failure as well. 
 * @param {object} options 
 * @returns 
 */
const errorBreakerHook = (fallback)=> async (ctx)=>{
  if(typeof fallback !== 'function') return;
  console.log(ctx.params);
  let name = ctx.params.breakerOptions.resolvedName;
  let breaker = global.breakers[name];
  ctx.result = await fallback(
    ctx,
    isBreakerError(ctx),
    name,
    breaker.stats
  );

  return ctx;
};

module.exports = {
  beforeBreakerHook,
  errorBreakerHook,
  isBreakerError
};