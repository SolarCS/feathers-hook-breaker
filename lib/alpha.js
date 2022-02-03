const CircuitBreaker = require('opossum');


global.breakers = {};





export const beforeBreaker = (options)=> async (ctx)=>{

    //render name
    //get the breaker by name
    //instantiate if it doesn't exist
    breaker.fire(new Promise((resolve,reject)=>{
        resolve()
    })).then(error=>{
        console.log('in the breaker fire')
    })
};



export const afterBreaker = (options)=> async (ctx)=>{




}