const { attachBreaker, breakerWrapper } = require('./breaker');
const { beforeBreakerHook, errorBreakerHook, } = require('./hooks');

module.exports = {

  attachBreaker,
  beforeBreakerHook,
  errorBreakerHook,
  breakerWrapper
};