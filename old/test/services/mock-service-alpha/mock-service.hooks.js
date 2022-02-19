const { beforeBreaker, afterBreaker } = require('../../../lib/alpha');

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
      beforeBreaker(options)
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
    all: [
      errorBreaker(options)
    ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
};
