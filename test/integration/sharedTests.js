
const assert = require('assert');
const sinon = require('sinon');
const { appFactory, defaultParams:p } = require('./shared');


exports.standardFunctionTests = function(ServiceClass,name){

  it('defined methods are still available', async () => {
    const service = appFactory(name, ServiceClass, {}, ['find']);
    assert.equal(typeof service._find, 'function');
    assert.equal(typeof service.find, 'function');
  });
  
  it('allowed methods are wrapped', async () => {
    const service = appFactory(name, ServiceClass, {}, ['find','_find']);
    assert.equal(service.find.name, 'newMethod');
    assert.equal(service._find.name, 'breaker__find');
  });
  
  it('disallowed methods are not wrapped', async () => {
    const service = appFactory(name, ServiceClass, {}, ['find']);
    assert.equal(service._find.name, '_find');
    assert.equal(service.get.name, 'newMethod');
  });
  
  it('allowed method fails twice and returns CircuitBreakerError', async () => {
    const service = appFactory(name, ServiceClass, {}, ['_get']);
    global.breakers ={};
    let error1 = await service.get(99,p).catch(e=>e.className);
    let error2 = await service.get(99,p).catch(e=>e.className);
    let error3 = await service._get(99,p).catch(e=>e.className);
    assert.equal(error1,'not-found');
    assert.equal(error2,'circuit-breaker-error');
    assert.equal(error3,'circuit-breaker-error');
  });

  it('disallowed method fails twice and returns error', async () => {
    const service = appFactory(name, ServiceClass, {}, ['find']);
    global.breakers ={};
    let error1 = await service.get(99,p).catch(e=>e.className);
    let error2 = await service.get(99,p).catch(e=>e.className);
    let error3 = await service._get(99,p).catch(e=>e.className);
    let error4 = await service._get(99,p).catch(e=>e.className);
    assert.equal(error1,'not-found');
    assert.equal(error2,'not-found');
    assert.equal(error3,'not-found');
    assert.equal(error4,'not-found');
  });
    
  it('allowed method succeeds and does trigger events', async () => {
    const service = appFactory(name, ServiceClass, {}, ['find']);
    let onFailure = sinon.spy(()=>{});
    let onSuccess = sinon.spy(()=>{});
    global.breakers ={};
    let params = {breakerOptions:{onFailure, onSuccess}};
    await service.find(params);
    assert.ok(onSuccess.called);
    assert.ok(!onFailure.called);
  });
    
    
  it('allowed method fails and does trigger events', async () => {
    const service = appFactory(name, ServiceClass, {}, ['get']);
    let onFailure = sinon.spy(()=>{});
    let onSuccess = sinon.spy(()=>{});
    global.breakers ={};
    let params = {breakerOptions:{onFailure, onSuccess}};
    let error = await service.get(99,params).catch(e=>e.className);
    assert.equal(error,'not-found');
    assert.ok(onFailure.called);
    assert.ok(!onSuccess.called);
  });
  
  it('skips hooks when calling _func without allowed _func', async () => {
    let beforeHook = sinon.spy(()=>{});
    let afterHook = sinon.spy(()=>{});
    let errorHook = sinon.spy(()=>{});
    const service = appFactory(name, ServiceClass, {paginate:{default:10}}, ['find'],{
      before: {all:[beforeHook]},
      after: {all:[afterHook]},
      error: {all:[errorHook]}
    });
    global.breakers ={};
    let result = await service._find(p).catch(e=>e.className);
    assert.ok(result.data);
    assert.ok(!beforeHook.called);
    assert.ok(!afterHook.called);
    assert.ok(!errorHook.called);
  });
    
  it('calls hooks when calling func with allowed func', async () => {
    let beforeHook = sinon.spy(()=>{});
    let afterHook = sinon.spy(()=>{});
    let errorHook = sinon.spy(()=>{});
    const service = appFactory(name, ServiceClass, {}, ['find','get'],{
      before: {all:[beforeHook]},
      after: {all:[afterHook]},
      error: {all:[errorHook]}
    });
    global.breakers ={};
    await service.find(p).catch(e=>e.className);
    await service.get(2,p).catch(e=>e.className);
    assert.ok(beforeHook.called);
    assert.ok(afterHook.called);
    assert.ok(errorHook.called);
  });
};

exports.customFunctionTests = function(ServiceClass,name){

  it('defined methods are still available', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    assert.equal(typeof service._custom, 'function');
    assert.equal(typeof service.custom, 'function');
  });

  it('allowed methods are wrapped', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    assert.equal(service.custom.name, 'breaker_custom');
  });

  it('disallowed methods are not wrapped', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    assert.equal(service._custom.name, '_custom');
  });

  it('allowed method fails twice and returns CircuitBreakerError', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    global.breakers ={};
    let error1 = await service.custom(99,p).catch(e=>e.className);
    let error2 = await service.custom(99,p).catch(e=>e.className);
    assert.equal(error1,'not-found');
    assert.equal(error2,'circuit-breaker-error');
  });

  it('disallowed method fails twice and returns error', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    global.breakers ={};
    let error1 = await service._custom(99,p).catch(e=>e.className);
    let error2 = await service._custom(99,p).catch(e=>e.className);
    assert.equal(error1,'not-found');
    assert.equal(error2,'not-found');
  });

  it('allowed method succeeds and does trigger events', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    let onFailure = sinon.spy(()=>{});
    let onSuccess = sinon.spy(()=>{});
    global.breakers ={};
    let params = {breakerOptions:{onFailure, onSuccess}};
    await service.custom(1,params);
    assert.ok(onSuccess.called);
    assert.ok(!onFailure.called);
  });


  it('allowed method fails and does trigger events', async () => {
    const service = appFactory(name, ServiceClass, {}, ['custom']);
    let onFailure = sinon.spy(()=>{});
    let onSuccess = sinon.spy(()=>{});
    global.breakers ={};
    let params = {breakerOptions:{onFailure, onSuccess}};
    let error = await service.custom(99,params).catch(e=>e.className);
    assert.equal(error,'not-found');
    assert.ok(onFailure.called);
    assert.ok(!onSuccess.called);
  });

  /**
   * THESE WILL NOT WORK UNTIL CUSTOM FUNCTIONS ARE INCLUDED IN HOOK PROCESSING, SEE V5
   */
  // it('skips hooks when calling _func without allowed _func', async () => {
  //   let beforeHook = sinon.spy(()=>{});
  //   let afterHook = sinon.spy(()=>{});
  //   let errorHook = sinon.spy(()=>{});
  //   const service = appFactory(name, ServiceClass, {}, ['custom'],{
  //     before: {all:[beforeHook]},
  //     after: {all:[afterHook]},
  //     error: {all:[errorHook]}
  //   });
  //   global.breakers ={};
  //   let result = await service._custom(1,p).catch(e=>e.className);
  //   await service._custom(99,p).catch(e=>e.className);
  //   assert.ok(result);
  //   assert.ok(!beforeHook.called);
  //   assert.ok(!afterHook.called);
  //   assert.ok(!errorHook.called);
  // });

  // it('calls hooks when calling func with allowed func', async () => {
  //   let beforeHook = sinon.spy(()=>{});
  //   let afterHook = sinon.spy(()=>{});
  //   let errorHook = sinon.spy(()=>{});
  //   const service = appFactory(name, ServiceClass, {}, ['custom'],{
  //     before: {all:[beforeHook]},
  //     after: {all:[afterHook]},
  //     error: {all:[errorHook]}
  //   });
  //   global.breakers ={};
  //   await service.custom(1,p).catch(e=>e.className);
  //   await service.custom(99,p).catch(e=>e.className);
  //   assert.ok(beforeHook.called);
  //   assert.ok(afterHook.called);
  //   assert.ok(errorHook.called);
  // });

};