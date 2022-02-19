const { breakerWrapper } = require('./breaker');
const { beforeBreakerHook, errorBreakerHook } = require('./hooks');

module.exports = {
  beforeBreakerHook,
  errorBreakerHook,
  breakerWrapper
};
