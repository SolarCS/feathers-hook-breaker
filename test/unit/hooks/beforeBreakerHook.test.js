const assert = require('assert');
const { beforeBreakerHook } = require('../../../lib/hooks');

let ctx = (count)=>({
  app:{
    get:()=>{
      return {
        rollingCountTimeout: count
      };
    }
  },
  params:{}
});

describe('UNIT \'beforeBreakerHook\' function', () => {
  
  it('uses base options', async () => {
    let _ctx = {...ctx(),app:{get:()=>({})}};
    let result = await beforeBreakerHook({})(_ctx);
    assert.equal(result.params.breakerOptions.rollingCountTimeout,10);
  });

  // describe('handles config options',async ()=>{
  it('uses config options', async () => {
    let result = await beforeBreakerHook({})(ctx(22));
    assert.equal(result.params.breakerOptions.rollingCountTimeout,22);
  });

  it('uses hook options', async () => {
    let result = await beforeBreakerHook({
      rollingCountTimeout:33
    })(ctx(22));
    assert.equal(result.params.breakerOptions.rollingCountTimeout,33);
  });

  it('uses params options', async () => {
    let result = await beforeBreakerHook({
      rollingCountTimeout:33
    })(
      {...ctx(22),
        params:{
          breakerOptions:{
            rollingCountTimeout:44
          }
        }
      });
    assert.equal(result.params.breakerOptions.rollingCountTimeout,44);
  });
});