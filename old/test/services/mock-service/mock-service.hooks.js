const circuitBreaker = require('../../../lib/breaker');

const breakerOptions = {
  fallback: () => {
    console.log('FALLBACK !!!!!!!!!!!!!');
    return {
      fallback: 'called'
    };
  }
};

module.exports = {
  before: {
    all: [
      circuitBreaker(breakerOptions)
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
