# Feathers-Hook-Breaker

This library is a FeathersJS-friendly way of using the  `nodeShift/opossum` circuit-breaker library.

## Feature List

* [x] Object, Class, and Adapter Service support
* [x] Event Triggers
* [x] Error Filtering
* [x] Optional Hook usage
* [x] Flexible Scoping
* [x] Breaker optionality per scope
* [ ] Shared Breaker State across instances
* [ ] Example implementations across GCP, AWS, and Azure
* [ ] Feathers v5 Support

## Quick Start

1. Run `npm install feathers-hook-breaker` from within your working directory.
2. Replace your `use('/path',new Service(options))` service function with `use('/path',breakerWrapper(Service,options))`
3. (optional) Add the following to your hooks

    ```javascript
        const { beforeBreakerHook, errorBreakerHook } = require('feathers-hook-breaker');
        module.exports = {
            before:{
                all:[
                    beforeBreakerHook({
                        name:(context)=>`${context.method}_${context.path}`
                    })
                ]
            }
            error:{
                all:[
                    errorBreakerHook(
                        (context)=>console.log('error was fired or caught')
                    )
                ]
            }
        }
    ```

## Setting Options

The default options are configured to trip the breaker after the first failure, rather than a percentage of failures. For more information, see:
https://nodeshift.dev/opossum/#circuitbreaker

```javascript
{
  rollingCountTimeout: 10, // listens for failures for 10ms
  rollingCountBuckets: 1, // tracks failures for the entire 10ms block
  errorThresholdPercentage: 1 // breaker trips if greater than 1/100 attempts within 10ms fail
  timeout: 3000, // how long to wait for a response before marking as a failure
  resetTimeout: 10000, // how long before setting the breaker to halfOpen and trying again
};
```

You can use all of the standard Opposum configurations and set them here in the following four ways:

```javascript
    // modifying the config/**env**.json files
    breaker:{ 
         ...options 
    } // doesn't work with functions, will apply to ALL breakers
    
    // setting the configuration after boot
    app.set('breaker':{
        ...options
    }) // can accept functions, will apply to ALL breakers

    // using a before hook
    beforeBreakerHook({
        ...options
    }) // can accept functions, will apply to the SCOPED breakers

    // passing as parameters in a service function
    app.service('serviceName').get(1,{
        breakerOptions:{
            ...options
        }
    }) // can accept functions, will apply to this REQUEST ONLY
```

The order of precedence for setting options is `base < app config < hook options < service params`;  As noted above, some methods of setting options will not allow you to use functions and thereby prevent you from using the hook context as part of your circuit-breaker scope and path decisions.


### Scoping the Breaker(s)

Breakers can be scoped by a `name` configuration option.

```javascript
    beforeBreakerHook({
        name:'my favorite service'
    })
```

And names can also be functions, accepting the hook context as the only parameter.  This can be helpful in setting per-service, per-method, or per-customer-key circuit-breakers. By default

```javascript
    beforeBreakerHook({
        name:(context)=>{
            return context.method + context.path + context.api_key
        }
    })
```

### Error Filters

Certain error codes can be filtered via the standard opossum errorFilter function:

```javascript
    beforeBreakerHook({
        errorFilter:(error)=>{
            if(error.status === 404) return true 
            //skips any 404 errors and allows them to bubble up to Feathers as normal.
            //truthy responses will not increment the failure count
        }
    })
```

## Wrapping a Service

Services must be wrapped by the breakerWrapper function in order to work.  Like Feathers, the wrapper can accept a `class`, `object`, or `AdapterService` based service component.  All types will resolve to a Class object and then be instantiated inside the wrapper.  

```javascript
    const { breakerWrapper } = require('feathers-hook-breaker');
    const memory = require('feathers-memory');

    app.use('/memorypath', memory(memoryOptions);
    //becomes
    app.use('/memorypath', breakerWrapper(memory,memoryOptions,['get','_update']);

    const ObjectService = {find:()=>{return []}};
    app.use('/objectpath', ObjectService;
    //becomes
    app.use('/objectpath', breakerWrapper(ObjectService,{},['find']);
```

The `breakerWrapper` function accepts three parameters: `service`, `serviceOptions`, `allowedMethods`.  `serviceOptions` are passed into the `service`'s constructor, in case that is required by your service.  

The `allowedMethods` is an array of the methods that you would like to use the breaker on.  Methods must be implemented by the service to be wrapped.  Methods from an Feather DB adapter (`_find`, `_get`, ...) can also be wrapped, in which case both the `find` and `_find` calls will trigger the adapter.  

> WARNING: Setting allowedMethods to `_find` and directly calling `_find` will _skip_ any options or functions set in the `beforeBreakerHook()`.  Options must be set as part of the direct parameters `app.service('books')._find({breakerOptions:{...}})` or must be set directly via config manipulation `app.set('breaker') = {...}`.

### Fallback Functions

Typical Circuit-Breakers allow fallback functions to trigger in the event of any failure to complete a request.  To set the fallback function, simply catch the error in an Error hook and trigger any additional actions you need.  You can also use this library's `errorBreakerHook` to trigger a fallback and pass in additional context about the circuit-breaker.  This can be helpful for logging breaker state.

```javascript
{
    error:{
        all:[
            // manual fallback 
            (context)=>{
                fallbackFunction(context) // if it should be non-blocking
                return await fallbackFunction(context); // if you want it to block the response to the user.
            }
            
            errorBreakerHook((
                 context, // the hook context
                 boolIsBreakerError, // a boolean if the error is the result of an open breaker (i.e. skipped request)
                 name, // the name or scope of the breaker that was used
                 stats, // a json snapshot of the breaker's state
             )=>{
                 // do your thing here
                 return await loggerSentStats(stats)
                 // or if you want asynchronous logging...
                 loggerSentStats(stats)
                 return;
             })
        ]
    }
}
```

## Throwing and Catching Errors

BreakerWrapped services will throw the underlying error first (timeout, etc.).  Once the breaker is open, the underlying error is replaced with a 'CircuitBreakerError' for any failed attempt to hit the service.  The original error can be accessed via error.underlying in subsequent hooks. For example, you can pass the original error;

```javascript
    errorBreakerHook(
        (context, boolIsBreakerError, name, stats)=>{
            if(!bookIsBreakerError){ //equivalent to (ctx.error.className == 'circuit-breaker-error')
                logger(context.error) // logs the error that came from the service
            }else if(context.error.underlying){
                logger('This error tripped the breaker', ctx.error.underlying) // if the error tripped the breaker
            }else{
                logger('Request was skipped because breaker is open and here are the stats',stats)
            }
          
        }
    )
```

## Additionally Emitted Events

BreakerWrapped services will also emit all the standard Oppossum events.  Functions can be called on each of these events by setting the event name proceeded by `on`.  For example:

```javascript
    beforeBreakerHook({
        onClose:()=>{console.log('breaker closed')},
        onHalfOpen:()=>{console.log('breaker is halfOpen')},
        // ..etc
        onFailure:()=>{console.log('request failed')}
    })
```

Available events are:
| Opossum Event        | Function Option           |
|----------------------|---------------------------|
| halfOpen             | onHalfOpen                |
| close                | onClose                   |
| open                 | onOpen                    |
| shutdown             | onShutdown                |
| fire                 | onFire                    |
| cacheHit             | onCacheHit                |
| cacheMiss            | onCacheMiss               |
| reject               | onReject                  |
| timeout              | onTimeout                 |
| success              | onSuccess                 |
| semaphoreLocked      | onSemaphoreLocked         |
| healthCheckFailed    | onHealthCheckFailed       |
| fallback             | DISALLOWED, use onFailure |
| failure              | onFailure                 |


