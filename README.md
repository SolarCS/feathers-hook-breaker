# feathers-opossum

[![Build Status](https://travis-ci.org/sajov/feathers-opossum.png?branch=master)](https://travis-ci.org/sajov/feathers-opossum)
[![Coverage Status](https://coveralls.io/repos/github/sajov/feathers-opossum/badge.svg?branch=master)](https://coveralls.io/github/sajov/feathers-opossum?branch=master)
[![dependencies Status](https://david-dm.org/sajov/feathers-opossum/status.svg)](https://david-dm.org/sajov/feathers-opossum)
[![Known Vulnerabilities](https://snyk.io/test/npm/feathers-opossum/badge.svg)](https://snyk.io/test/npm/feathers-opossum)

[feathers-opossum](https://github.com/sajov/feathers-opossum) is a circuit breaker for Feathers adapters. It implements the [opossum](https://github.com/nodeshift/opossum) module.

```
npm install feathers-opossum --save
```

## API

### `service(options)`

```javascript
const service = require('service');
const opossumService = require('feathers-opossum');

const options = {
  opossum: {
    timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 30000 // After 30 seconds, try again.
  },
  fallback: () => {
    errro: 'Sorry, out of service right now';
  },
  onFallback: result => reportFallbackEvent(result),
  // this means only find and get method relay on circur breaking
  methods: ['find', 'get'], // feel free to use updat, patch amd remove
};

const circuitedService = opossumService(service, {id:'_id', paginate: {max:10 }, options);

app.use('/may-fail', circuitedService);
```

> Options per Service Method

```javascript
  const options = {
      find: {
        opossum: {
          timeout: 5000, // If our function takes longer than 3 seconds, trigger a failure
          errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
          resetTimeout: 30000 // After 30 seconds, try again.
        }
        fallback: () => {
          error: 'Sorry, out of service right now';
        },
        onFallback: result => reportFallbackEvent(result)
      },
      get: {
        opossum: {
          timeout: 1000, // If our function takes longer than 3 seconds, trigger a failure
          errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
          resetTimeout: 30000 // After 30 seconds, try again.
        }
        fallback: () => {
           error: 'Sorry, out of service right now';
        },
        onFallback: result => reportFallbackEvent(result)
      }
    };
```

## Changelog

**0.1.0**

- publish

...

## License

Copyright (c) 2020

Licensed under the [MIT license](LICENSE).
