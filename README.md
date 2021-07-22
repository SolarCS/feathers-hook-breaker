## Pre-release notes for devs

there is currently no NPM package for this. to use or install, just copy `lib/breaker.js` into `src/hooks/` or maybe directly into your service's folder. Then run `npm i opossum` in your working dir. I'll publish to NPM once I have the ability to publish a private package

the breaker itself is located at `/lib/breaker.js`

a mock service has been created in `test/services`

`test/adapter.test.js` tests the `feathers-adapters` suite

`test/breaker.test.js` tests the basic circuit-breaker functionality

to run the test suite, call `npm run test`. this will run the entire suite, so comment out any tests you don't want run

to run the test suite with continuous re-run, call `npm run mocha:watch`

LEFT TO DO:
- Find a way to test the error-catching function of the breaker. I know it works, because it works in the Gateway. But without simulating HTTP responses, I can't seem to get the breaker to interpret the error correctly. (Ugh. Either there's a legit way to do this, or, as the Black Crowes would say, "Am I just plain lazy?")
- Confirm that you need to call `super._theMethod(args)` in the service.class.js file. Currently that's just an educated assumption.
- On the same note, the setup/usage may be different if using various DB adapters (such as feathers-sequelize). Need to figure that out as well. Initial research suggests that if using an adapter, you'l still need to include the `_method` definitions in the class, but `class XXX extends Service` should cover the inheritance chain.


## Feathers-Hook-Breaker

![Node.js CI](https://github.com/nodeshift/opossum/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/nodeshift/opossum/badge.svg?branch=master)](https://coveralls.io/github/nodeshift/opossum?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/npm/opossum/badge.svg)](https://snyk.io/test/npm/opossum)
[![Dependencies Status](https://david-dm.org/nodeshift/opossum/status.svg)](https://david-dm.org/nodeshift/opossum/status.svg)

Feathers-Hook-Breaker is an Opossum-based circuit breaker built to be called from within the hook chain of a service method call. As a default, FHB protects the entire service, but allows for more granular protection by including a `circuitOwner` field in the options passed to the breaker.

At its core, Feathers-Hook-Breaker works by calling the raw, hookless `service._someMethod` as the breaker action, acting as a hook to the original method call while simultaneously overriding the original method call.

<img width="1024" alt="Screen Shot 2021-07-21 at 1 42 05 PM" src="https://user-images.githubusercontent.com/50502798/126534927-697700bc-24f9-4d29-b4e6-997676325e83.png">

- More information about the feathers hook chain is available in the [Feathersjs Docs](https://docs.feathersjs.com/api/hooks.html)
- For more information about the Opossum library, see the [Opossum Docs](https://nodeshift.dev/opossum/)
- More information about circuit breakers in general is available from [Martin Fowler](http://martinfowler.com/bliki/CircuitBreaker.html) or the guys at [Campion](https://campion-breaker.github.io/case-study.html#circuit-breaker-pattern)

## Using the Breaker

To save yourself some headaches later, make sure to follow the instructions carefully. Or don't. I'm not a cop.

### Setup

First, run `npm install feathers-hook-breaker` from within your working directory.

Then, within the to-be-protected service's `class.js` file, make the following changes:
  1. Require the `AdapterService` from '@feathersjs/adapter-commons' at the top of the file:
  2. Have your service extend `AdapterService`, complete with the necessary constructor:
  3. Inside the service, define the hookless (ex: `_create` instead of `create`) version of every method you intend to protect (to protect the entire service, define ALL hookless methods). 
  4. Unless you plan to override the hookless method beyond the default Feathersjs definition, `return super._theMethod(args)` inside the function definition.

In the end, an entirely-protected service's `class.js` file would look like this:

```javascript
const { AdapterService } = require('@feathersjs/adapter-commons');

exports.SomeService = class SomeService extends AdapterService {
  constructor (options, app) {
    super(options, app);
    this.options = options || {};
    this.app = app;
  }
  
  async _find (params) {
    return super._find(params);
  }
  
  async _get (id, params) {
    return super._get(id, params);
  }
  
  async _create (data, params) {
    return super._create(data, params);
  }
  
  async _update (id, data, params) {
    return super._update(id, data, params);
  }
  
  async _patch (id, data, params) {
    return super._patch(id, data, params);
  }
  
  async _remove (id, params) {
    return super._remove(id, params);
  }
};
```

- The hookless functions defined in your now-protected class should call `super._method(args)` only as a default, as though the `AdapterService` was making the actual call. Feel free to replace `super._method(args)` with whatever functionality you require. That being said...
- **DO NOT CATCH ERRORS WITH YOUR HOOKLESS METHODS.** The breaker operates by interpreting any timeouts or error responses, so if those errors are caught by the method call the breaker won't be able to use them. Opossum includes an `errorFilter` that will allow errors to pass through without tripping the breaker. Feathers-Hook-Breaker will throw those errors itself, so **DO NOT CATCH ERRORS WITH YOUR HOOKLESS METHODS.**

### Usage 

Require 'feathers-hook-breaker' in whichever file you define your actual breaker hook function, and assign it to a function variable. Create a new asynchronous hook function, and await the new breaker function within the hook function, passing in any desired breaker init options, and calling it with a binding to the context object.

``` javascript
const FHB = require('feathers-hook-breaker');

const breakerHookFunction = (options = {}) => {
  return async ctx => {
    const breakerOptions = {
      timeout: 2500,
      resetTimeout: 8000,
      onSuccess: () => console.log('Successful method call'),
      fallback: (breakerIsOpen) => {
        if (breakerIsOpen) {
          console.log('Method call skipped, breaker open.');
        } else {
          console.log('Method call failed');
        }
        
        return {
          status: 'fallback called',
          ...ctx.data
        }
      },
      ...options
    };
    
    await FHB(breakerOptions).call(this, ctx);
    
    return ctx;
  };
};
```

*Don't forget the* `.call(this, ctx)` *suffix when you call the breaker itself.*

### Inserting the Breaker into the Hook Chain

If no other `before` hooks are required by the method, the breaker function can then be called in the `before.all` hook chain:

```javascript
// either require your breakerHookFunction or require feathers-hook-breaker and define your breakerHookFunction here...

module.exports = {
  before: {
    all: [ breakerHookFunction() ],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },
  
  after: {
    ......
```

However, because the breaker will make the actual method call from within the hook, and because of the hook chain order (`before.all` hooks prior to `before[method]` hooks), if there are any other hooks required, the breaker hook function must be called AFTER any other hooks in the chain:

```javascript
// either require your breakerHookFunction or require feathers-hook-breaker and define your breakerHookFunction here...

module.exports = {
  before: {
    all: [ authenticate() ],
    find: [ breakerHookFunction() ],
    get: [ breakerHookFunction() ],
    create: [
      validateDate(),
      breakerHookFunction()
    ],
    update: [
      validateDate(),
      breakerHookFunction()
    ],
    patch: [
      validateDate(),
      breakerHookFunction()
    ],
    remove: [ breakerHookFunction() ]
  },
  
  after: {
    ......
```

### Events

*While Opossum is built on events, event listeners should be used sparingly and deliberately for any service that may experience concurrent method calls, as an event emitted by one call may affect the other calls.*

Opossum is built with event-based functionality, and allows event listener functions to be added to the breaker. To do this, add a key-value pair to the options passed to the breaker in the following format:
  - key: prepend one of Opossum's emitted events with the keyword `on`, in camelCase style (`onSuccess`, `onReject`, `onClose`)
  - value: define the function to be executed when the event is emitted

```javascript
const breakerOptions = {
  onSuccess: () => console.log('Successful method call'),
  onClose: () => {
    tellSomeQueueServiceToStartRetrying();
  }
};
```

The arguments passed/available to the event listener functions aren't consistent. For example, the `'success'` event passes the response object to the listener function, while the `'fallback'` event passes the return from the `fallback` function. Most, if not all, other events don't pass arguments to the listener function at all. 

To work with data in the event listener functions, define a data type in the `breakerHookFunction` scope, and access (and return) that data in the listener function:

```javascript
const breakerHookFunction = (options = {}) => {
  return async ctx => {
    const logObject = {};

    const breakerOptions = {
      onOpen: () => {
        logObject.openedAt = Date.now();
        return logObject;
      },
    };
    
    await FHB(breakerOptions).call(this, ctx);

    if (logObject.openedAt) {
      sendLogObjectToLogService();
    }
    
    return ctx;
  };
};
```

### The Fallback Function

The fallback function is the function that will be executed if either a) the method call fails, or b) the breaker is already open. 

Opossum passes the fallback function the same data arguments that were passed to the `breaker.fire()` call (`{ ctx.id, ctx.data, ctx.params }`). In addition, Feathers-Hook-Breaker passes the current state of the breaker, pre-method-call. Include this boolean param in your fallback function if you want to handle method call rejections (`breakerIsOpen === true`) differently from method call failures (`breakerIsOpen === false`).

If the fallback function is called, its return is the value that is assigned to `ctx.result` in leiu of the successful response. *If the fallback function does not return anything,* `ctx.result` *will be set to* `undefined`.

```javascript
const breakerOptions = {
  fallback: (data, breakerIsOpen) => {
    if (breakerIsOpen) {
      console.log('Method call skipped, breaker open.');
    } else {
      console.log('Unsuccessful method call.');
    }
    
    return {
      status: 'fallback called',
      ...data
    }
  }
};
```

*Note that the fallback function field is* `fallback`*, not* `onFallback`. `onFallback` *would be a valid listener function to be called any time the* `fallback` *function executes.*

### A Note on Options

Feathers-Hook-Breaker's default configuration is for a 3-second timeout, a 10-second `halfOpen` state, and failure settings configured to trip the breaker after a single failure (10000req/sec volume).

To override the timeout or the `halfOpen` time, include the fields `timeout` and `resetTimeout`, respectively, in your breaker options.

To override the single-failure settings, and trip the breaker based on a percentage of failures, include the `rollingCountTimeout`, `rollingCountBuckets`, and `errorThresholdPercentage` fields in your breaker options. [Here](https://github.com/nodeshift/opossum#calculating-errorthresholdpercentage) is more information about Opossum's `errorThresholdPercentage`.

### Manipulating the Breaker

Feathers-Hook-Breaker stores the various breaker configuration objects in a global object called `breakers`. This allows the breakers to be accessed and manipulated by calling `global.breakers[someBreakerName]` after initializing a breaker. This is especially useful for testing, as it allows hard-coded breaker manipulation. Three frequent uses of hard-coded breaker manipulation are:
- Adjusting the `timeout` or `resetTimeout` settings to speed up the test run
- Forcing the breaker to the open or close state to test fallback functions (via `.open()` or `.close()` breaker methods)
- Accessing the `.stats` object, in order to track the breaker's event emission records

By default, the key where the breaker is stored is the name of the service. If `options.circuitOwner` is passed to the breaker on initialization, the breaker is stored at  is `nameOfTheService + '|' + options.circuitOwner`

```javascript
describe('circuit breaker tests', () => {
  let testBreaker;

  before('create circuit breaker', async () => {
    await app.service('test-service').find();

    testBreaker = global.breakers['test-service'];
    testBreaker.options.resetTimeout = 500;
  });
  
  it('tests the fallback function', () => {
    testBreaker.open();
    
    await app.service('test-service').find();
    
    assert.ok('something something fallback function return');
    assert.ok(testBreaker.stats.fallbacks === 1);
    
    testBreaker.close();
  });
});
```

Additionally, all active breakers can be found by accessing `global.breakers` directly.
