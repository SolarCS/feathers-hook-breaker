/* eslint-disable no-unused-vars */
const assert = require('assert');
const { attachBreaker } = require('../../lib/breaker');
const EventEmitter = require('events');
const sinon = require('sinon');
const { BadRequest } = require('@feathersjs/errors');

describe('UNIT \'attachBreaker\' function', () => {
  describe('handles Objects', async () => {
    const wrapped = () => true;
    const failed = () => { throw new BadRequest(); };

    it('uses string name', async () => {
      const ServiceClass = { wrapped };
      const breakerOptions = { name: 'test0' };
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions });
      assert.ok(global.breakers.test0);
    });

    it('uses function name', async () => {
      const ServiceClass = { wrapped };
      const breakerOptions = { name: () => 'test1' };
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions });
      assert.ok(global.breakers.test1);
    });

    it('uses default name', async () => {
      const ServiceClass = { wrapped };
      const breakerOptions = { name: undefined };
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions });
      assert.ok(global.breakers.default_wrapped);
    });

    it('triggers success event', async () => {
      const ServiceClass = { wrapped };
      const onFailure = sinon.spy((ctx) => {});
      const onSuccess = sinon.spy((ctx) => {});
      global.breakers = {};
      const breakerOptions = { onFailure, onSuccess };
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions });
      assert.ok(onSuccess.called);
      assert.ok(!onFailure.called);
    });

    it('triggers failure event', async () => {
      const ServiceClass = { wrapped: failed };
      const onFailure = sinon.spy((ctx) => {});
      const onSuccess = sinon.spy((ctx) => {});
      global.breakers = {};
      const breakerOptions = { onFailure, onSuccess };
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions })
        .then(() => assert.ok(false, 'Should not reach'))
        .catch(e => {
          assert.equal(e.className, 'bad-request');
        });
      assert.ok(!onSuccess.called);
      assert.ok(onFailure.called);
    });

    it('triggers fallback and passes on Error open and closed', async () => {
      const ServiceClass = { wrapped: failed };
      global.breakers = {};
      const breakerOptions = {};
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions })
        .then(() => assert.ok(false, 'Should not reach'))
        .catch(e => {
          assert.equal(e.className, 'bad-request');
        });
      await attachBreaker(ServiceClass.wrapped, 'wrapped')(1, { breakerOptions })
        .then(() => assert.ok(false, 'Should not reach'))
        .catch(e => {
          assert.equal(e.className, 'circuit-breaker-error');
        });
    });
  });
});
