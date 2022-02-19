const assert = require('assert');
const { addEventListeners } = require('../../lib/breaker');
const EventEmitter = require('events');
const sinon = require('sinon');

describe('UNIT \'attachListener\' function', () => {
  it('does not attach without prepended "on"', async () => {
    const emitter = new EventEmitter();
    const close = sinon.spy(() => {});
    const options = {
      close
    };
    addEventListeners(emitter, options);
    emitter.emit('close');
    assert.ok(!close.called);
  });

  it('attaches with prepended "on"', async () => {
    const emitter = new EventEmitter();
    const onClose = sinon.spy(() => {});
    const options = {
      onClose
    };
    addEventListeners(emitter, options);
    emitter.emit('onClose');
    assert.ok(!onClose.called);
  });

  it('does not attach outside of base events', async () => {
    const emitter = new EventEmitter();
    const onExtra = sinon.spy(() => {});
    const extra = sinon.spy(() => {});
    const options = {
      extra,
      onExtra
    };
    addEventListeners(emitter, options);
    emitter.emit('extra');
    assert.ok(!onExtra.called);
    assert.ok(!extra.called);
  });

  it('attaches with prepended "on"', async () => {
    const emitter = new EventEmitter();
    const onClose = sinon.spy(() => {});
    const options = {
      onClose
    };
    addEventListeners(emitter, options);
    emitter.emit('close');
    assert.ok(onClose.called);
  });
});
