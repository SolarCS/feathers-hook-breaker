/* eslint-disable no-unused-vars */
const assert = require('assert');
const { breakerWrapper } = require('../../lib/breaker');


describe('UNIT \'breakerWrapper\' function', () => {
  
  describe('handles Objects',()=>{
    it('returns an breaker function for Object', () => {
      let input = {
        wrapped:()=>{return 1;}
      };
      let output = breakerWrapper(input,{},['wrapped']);
      assert.notEqual(input, output);
      assert.notEqual(input.wrapped.name, output.wrapped.name); 
      assert.equal(input.wrapped.name, 'wrapped');
      assert.equal(output.wrapped.name, 'breaker_wrapped'); 
    });

    it('filters methods from Object', () => {
      let input = {
        wrapped:()=>{return 1;},
        notWrapped:()=>{return 2;}
      };
      let output = breakerWrapper(input,{},['wrapped']);
      assert.equal(output.notWrapped.name, 'notWrapped'); 
    });

  });
  //confirms ServiceClass is Class or Object
    
  describe('handles Classes', ()=>{
  
    it('returns an breaker function for Class', () => {
      let input = class Input {
        wrapped(){ return 1;}
      };
      let output = breakerWrapper(input,{},['wrapped']);
      assert.equal(input.prototype.wrapped.name, 'wrapped');
      assert.equal(output.wrapped.name, 'breaker_wrapped'); 
    });

    it('filters methods from Class', () => {
      let input = class Input {
        wrapped(){ return 1;}
        notWrapped(){return 2;}
      };
      let output = breakerWrapper(input,{},['wrapped']);
      assert.equal(output.notWrapped.name, 'notWrapped'); 
    });
  
  });
  
  describe('Handles other Inputs', ()=>{
    it('fails to wrap with int', () => {
      try{
        breakerWrapper(1);
        assert.fail();
      } catch(e){
        assert.ok(true);
      }
    });
  
    it('fails to wrap with string', () => {
      try{
        breakerWrapper('failed');
        assert.fail();
      } catch(e){
        assert.ok(true);
      }
    });
  });
});