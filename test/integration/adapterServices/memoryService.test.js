/* eslint-disable no-unused-vars */
const assert = require('assert');
const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');
const sinon = require('sinon');
const { defaultParams:p, appFactory } = require('../shared');
const { breakerWrapper, beforeBreakerHook, errorBreakerHook } = require('../../../lib');
const { standardFunctionTests,  customFunctionTests } = require('../sharedTests');

  

describe('INTEGRATION \'memory\' service', () => {
  let name = 'kittens';
  let ServiceClass = memory;
  
  it('registered the service', () => {
    const service = appFactory(name, ServiceClass, {}, ['get']);
    assert.ok(service, 'Registered the service');
  });

  describe('standard methods (find/get)', () => {
    standardFunctionTests(ServiceClass,name);
  });

});

