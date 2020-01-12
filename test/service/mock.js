class MockService {
  constructor(options = {}) {
    this.name = 'test';
    this.delay = options.delay || 1000;
  }
  async timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  async get(id, params) {
    await this.timeout(parseInt(id) > this.delay ? parseInt(id) : this.delay);
    return { id: 1, name: 'john' };
  }
  async find(params) {
    await this.timeout(params.delay && params.delay > this.delay ? params.delay : this.delay);
    return [{ id: 1, name: 'john' }];
  }
  async update(params) {
    await this.timeout(this.delay);
    return [{ id: 1, name: 'john' }];
  }
  async patch(id, params) {
    await this.timeout(this.delay);
    return { id: 1, name: 'john' };
  }
  async remove(id, params) {
    await this.timeout(this.delay);
    return { id: 1, name: 'john' };
  }
}

module.exports = options => {
  return new MockService(options);
};

module.exports.Service = MockService;
