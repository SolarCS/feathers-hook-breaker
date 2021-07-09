exports.MockService = class MockService {
  constructor (options = {}, app) {
    this.name = 'test';
    this.options = options || {};
    this.app = app;
    this.events = ['testing'];
  }

  async timeout (delay = 1000) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async _get (id, params) {
    // console.log('_GET GOT CALELELELELELELELELEEELED');
    await this.timeout(parseInt(id));
    return { id: 1, name: 'john' };
  }

  async _find (params) {
    // console.log('_FIND GOT CALELELELELELELELELEEELED');
    await this.timeout(params.delay);
    return [{ id: 1, name: 'john' }];
  }

  async _update (id, data, params) {
    // console.log('_UPDATE GOT CALELELELELELELELELEEELED', params.delay);
    await this.timeout(parseInt(id));
    return [{ id: 1, name: 'frank' }];
  }

  async _patch (id, data, params) {
    // console.log('_PATCH GOT CALELELELELELELELELEEELED');
    await this.timeout(parseInt(id));
    return { id: 1, name: 'john' };
  }

  async _remove (id, params) {
    // console.log('_REMOVE GOT CALELELELELELELELELEEELED');
    await this.timeout(params.delay);
    return { id: 1, name: 'john' };
  }

  async _create (data, params) {
    // console.log('_CREATE GOT CALELELELELELELELELEEELED');
    await this.timeout(params.delay);
    return data;
  }

  async get (id, params) {}

  async find (params) {}

  async update (id, data, params) {}

  async patch (id, data, params) {}

  async remove (id, params) {}

  async create (data, params) {}
};
