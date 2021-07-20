## Pre-release notes for devs

the breaker itself is located at `/lib/index.js`

a mock service has been created in `test/services`

`test/adapter.test.js` tests the `feathers-adapters` suite

`test/index.test.js` tests the basic circuit-breaker functionality

to run the test suite, call `npm run test`. this will run the entire suite, so comment out any tests you don't want run

basically everything else in the repo is leftover from the original repo template (feathers-opossum)


## Feathers-Hook-Breaker

Feathers-Hook-Breaker is an Opossum-based circuit breaker built to be called from within the hook chain of a service method call. As a default, FHB protects the entire service, but allows for more granular protection by including a `circuitOwner` field in the options passed to the breaker.

At its core, Feathers-Hook-Breaker works by calling the raw, hookless service '_method' as the breaker action, acting as a hook to the original method call while simultaneously overriding the original method call.

<img width="674" alt="Screen Shot 2021-07-20 at 2 04 44 PM" src="https://user-images.githubusercontent.com/50502798/126388883-31bf3729-3773-4ab3-91a6-5e338c0fac62.png">

- More information about the feathers hook chain is available in the [Feathersjs Docs](https://docs.feathersjs.com/api/hooks.html)
- For more information about the Opossum library, see the [Opossum Docs](https://nodeshift.dev/opossum/)
- More information about circuit breakers in general is available from [Martin Fowler](http://martinfowler.com/bliki/CircuitBreaker.html) or the guys at [Campion](https://campion-breaker.github.io/case-study.html#circuit-breaker-pattern)

## Using the Breaker

To save yourself some headaches later, make sure to follow the instructions carefully.

### Setup

First, run `npm install feathers-hook-breaker` from within your working directory.

Then, within the to-be-protected service's `class.js` file, make the following changes:
  1. Require the `AdapterService` from '@feathersjs/adapter-commons' at the top of the file:
  2. Have your service extend `AdapterService`, complete with the necessary constructor:
  3. Inside the service, define the hookless (ex: `_create` instead of `create`) version of every method you intend to protect (to protect the entire service, define ALL hookless methods). 
  4. Unless you plan to override the hookless method beyond the default Feathersjs definition, `return super._theMethod(args)` inside the function definition. In the end, an entirely-protected service's `class.js` file would look like this:

<img width="618" alt="Screen Shot 2021-07-20 at 6 00 03 PM" src="https://user-images.githubusercontent.com/50502798/126400999-ef259f59-23cd-474f-a011-9ca5ae31ecf9.png">

- The hookless functions defined in your now-protected class should call `super._method(...args)` only as a default, as though the `AdapterService` was making the actual call. Feel free to replace `super._method(...args)` with whatever functionality you require. That being said...
- **DO NOT CATCH ERRORS WITH YOUR HOOKLESS METHODS.** The breaker operates by interpreting any timeouts or error responses, so if those errors are caught by the method call the breaker won't be able to use them. Opossum includes an `errorFilter` that will allow errors to pass through without tripping the breaker. Feathers-Hook-Breaker will throw those errors itself, so **DO NOT CATCH ERRORS WITH YOUR HOOKLESS METHODS.**

### Usage 

Require 'feathers-hook-breaker' in whichever file you define your actual breaker hook function, and assign it to a function variable. Create a new asynchronous hook function, and await the new breaker function within the hook function, passing in any desired breaker init options, and calling it with a binding to the context object.

<img width="590" alt="Screen Shot 2021-07-20 at 2 46 51 PM" src="https://user-images.githubusercontent.com/50502798/126388719-f2ce251b-0ca5-4a72-837f-a7750d25abae.png">

*Don't forget the* `.call(this, ctx)` *suffix when you call the breaker itself*
### Inserting the Breaker into the Hook Chain

If no other `before` hooks are required by the method, the breaker function can then be called in the `before.all` hook chain:

<img width="352" alt="Screen Shot 2021-07-20 at 2 57 32 PM" src="https://user-images.githubusercontent.com/50502798/126388822-ca5c9d96-efe4-4e07-90e3-4d1e8608786d.png">

However, because the breaker will make the actual method call from within the hook, and because of the hook chain order (`before.all` hooks prior to `before[method]` hooks), if there are any other hooks required, the breaker hook function must be called AFTER any other hooks in the chain:

<img width="356" alt="Screen Shot 2021-07-20 at 2 56 41 PM" src="https://user-images.githubusercontent.com/50502798/126388781-a333d8fb-ee9f-4803-ae50-5f2f965f14f8.png">

### Events

*While Opossum is built on events, event listeners should be used sparingly and deliberately for any service that may experience concurrent method calls, as an event emitted by one call may affect the other calls.*

Opossum is built with event-based functionality, and allows event listener functions to be added to the breaker. To do this, add a key-value pair to the options passed to the breaker in the following format:
  - key: prepend one of Opossum's emitted events with the keyword `on`, in camelCase style (`onSuccess`, `onReject`, `onClose`)
  - value: define the function to be executed when the event is emitted
 
At this time, only the events outlined in the [Opossum Docs](https://nodeshift.dev/opossum/) are emitted.

*Example at line 8 in the image below:*

<img width="584" alt="Screen Shot 2021-07-20 at 6 07 59 PM" src="https://user-images.githubusercontent.com/50502798/126401635-80ac7bba-5d35-4c0b-9f6b-3af582f354e3.png">

### The Fallback Function

*Example at lines 9-19 in the above image.*

The fallback function is the function that will be executed if either a) the method call fails, or b) the breaker is already open. 

Feathers-Hook-Breaker naturally passes the current state of the breaker, pre-method-call, to the fallback function. Feel free to include this boolean param in your fallback function if you want to handle method call rejections (`breakerIsOpen === true`) differently from method call failures (`breakerIsOpen === false`).

If the fallback function is called, its return is the value that is assigned to `ctx.result` in leiu of the successful response.

*Note that the fallback function field is* `fallback`, *not* `onFallback`. `onFallback` *would be a valid listener function to be called any time the* `fallback` *function executed.*

### A Note on Options

Feathers-Hook-Breaker's default configuration is for a 3-second timeout, a 10-second `halfOpen` state, and failure settings configured to trip the breaker after a single failure (10000req/sec volume).

To override the timeout or the `halfOpen` time, include the fields `timeout` and `resetTimeout`, respectively, in your breaker options.

To override the single-failure settings, and trip the breaker based on a percentage of failures, include the `rollingCountTimeout`, `rollingCountBuckets`, and `errorThresholdPercentage` fields in your breaker options.
