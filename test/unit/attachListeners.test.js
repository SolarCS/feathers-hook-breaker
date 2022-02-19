const assert = require('assert');
const {addEventListeners } = require('../../lib/breaker');
const EventEmitter = require('events');
const sinon = require('sinon');

describe('UNIT \'attachListener\' function', () => {


  it('does not attach without prepended "on"', async () => {
    let emitter = new EventEmitter();
    let close = sinon.spy(()=>{});
    let options = {
      close
    };
    addEventListeners(emitter,options);
    emitter.emit('close');
    assert.ok(!close.called);
  });

  it('attaches with prepended "on"', async () => {
    let emitter = new EventEmitter();
    let onClose = sinon.spy(()=>{});
    let options = {
      onClose
    };
    addEventListeners(emitter,options);
    emitter.emit('onClose');
    assert.ok(!onClose.called);
  });

  it('does not attach outside of base events', async () => {
    let emitter = new EventEmitter();
    let onExtra = sinon.spy(()=>{});
    let extra = sinon.spy(()=>{});
    let options = {
      extra,
      onExtra
    };
    addEventListeners(emitter,options);
    emitter.emit('extra');
    assert.ok(!onExtra.called);
    assert.ok(!extra.called);
  });

  it('attaches with prepended "on"', async () => {
    let emitter = new EventEmitter();
    let onClose = sinon.spy(()=>{});
    let options = {
      onClose
    };
    addEventListeners(emitter,options);
    emitter.emit('close');
    assert.ok(onClose.called);
  });


});