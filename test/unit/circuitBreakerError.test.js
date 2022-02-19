const assert = require('assert');
const  { CircuitBreakerError } = require('../../lib/breaker');

describe('UNIT \'circuitBreakerError\' function', () => {

  it('error returns 503', async () => {
    try{ throw new CircuitBreakerError();}catch(e){
      assert.equal(e.code,503);
    }
  });

  it('error has correct className', async () => {
    try{ throw new CircuitBreakerError();}catch(e){
      assert.equal(e.className,'circuit-breaker-error');
    }
  });
  
  it('error has correct type (Feathers)', async () => {
    try{ throw new CircuitBreakerError();}catch(e){
      assert.equal(e.type,'FeathersError');
    }
  });

  it('error message can be passed', async () => {
    try{ throw new CircuitBreakerError('message',1);}catch(e){
      assert.equal(e.message,'message');
    }
  });

  it('error data can be passed', async () => {
    try{ throw new CircuitBreakerError('message',1);}catch(e){
      assert.equal(e.data,1);
    }
  });

});