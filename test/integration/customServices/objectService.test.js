/* eslint-disable no-unused-vars */
const assert = require('assert');
const { NotFound, BadRequest, GeneralError } = require('@feathersjs/errors');
const { standardFunctionTests, customFunctionTests } = require('../sharedTests');
const { appFactory } = require('../shared');

const ServiceClass = {
  async find (params) {
    return { total: 0, data: [] }; // this._find(params);
  },
  async _find (params) {
    return { total: 0, data: [] };
  },
  async get (id, params) {
    return this._get(id, params);
  },
  async _get (id, params) {
    if (id === 1) {
      return { id: 1 };
    } else if (id === 2) {
      throw new BadRequest(id);
    } else if (id === 3) {
      throw new GeneralError(id);
    } else {
      throw new NotFound(id);
    }
  },
  async custom (id, params) {
    return this.get(id, params);
  },
  async _custom (id, params) {
    return this.get(id, params);
  }

};

describe('INTEGRATION \'Object\' service', async () => {
  const name = 'kittens';

  it('registered the service', () => {
    const service = appFactory(name, ServiceClass, {}, ['find']);
    assert.ok(service, 'Registered the service');
  });

  describe('standard methods', () => {
    standardFunctionTests(ServiceClass, name);
  });

  describe('custom methods', () => {
    customFunctionTests(ServiceClass, name);
  });
});
