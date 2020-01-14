# feathers-opossum

[![Build Status](https://travis-ci.org/sajov/feathers-opossum.png?branch=master)](https://travis-ci.org/sajov/feathers-opossum)
[![Coverage Status](https://coveralls.io/repos/github/sajov/feathers-opossum/badge.svg?branch=master)](https://coveralls.io/github/sajov/feathers-opossum?branch=master)
[![dependencies Status](https://david-dm.org/sajov/feathers-opossum/status.svg)](https://david-dm.org/sajov/feathers-opossum)
[![Known Vulnerabilities](https://snyk.io/test/npm/feathers-opossum/badge.svg)](https://snyk.io/test/npm/feathers-opossum)

[feathers-opossum](https://github.com/sajov/feathers-opossum) is a [circuit breaker](https://martinfowler.com/bliki/CircuitBreaker.html) for Feathers services. It implements the [opossum](https://github.com/nodeshift/opossum) module.

```
npm install feathers-opossum --save
```

## API

### `service(Service, serviceOptions, opossumOptions)`

Example:

```javascript
const service = require('service');
const opossumService = require('feathers-opossum');

const options = {
  opossum: {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  },
  fallback: () => {
    errro: 'Sorry, out of service right now';
  },
  events: {
    fallback: result => reportFallbackEvent(result),
  }
  methods: ['find', 'get']
};

const circuitedService = opossumService(service, {id:'_id', paginate: {max:10 }, options);

app.use('/may-fail', circuitedService);
```

Options:

- `Service` (**required**) - The main service
- `opossum.timeout` (optional, default: 3000) - If our function takes longer than trigger a failure
- `opossum.errorThresholdPercentage` (optional, default: 50) - When this ratio on requests fail, trip the circuit
- `opossum.resetTimeout` (optional, default: 30000) - After this try again.
- `fallback` - A fallback function that will be executed in the event of failure.
- `onFallback` - A listener for the fallback event.

Options per Service Method:

```javascript
  const options = {
      find: {
        opossum: {
          timeout: 5000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000
        }
        fallback: () => {
          return 'Sorry, out of service right now';
        },
        events: {
          fallback: result => reportFallbackEvent(result),
        }
      },
      get: {
        opossum: {
          timeout: 1000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000
        }
        fallback: () => {
          return 'Sorry, out of service right now';
        },
        events: {
          fallback: result => reportFallbackEvent(result),
        }
      }
    };
```

## Changelog

**1.0.0**

- implement opossum events
- add event test

**0.1.0**

- publish

...

## License

Copyright (c) 2020

Licensed under the [MIT license](LICENSE).
