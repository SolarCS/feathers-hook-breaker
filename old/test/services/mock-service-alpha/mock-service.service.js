// Initializes the `mock-service` service on path `/mock-service`
const { MockService } = require('./mock-service.class');
const hooks = require('./mock-service.hooks');

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  };

  // Initialize our service with any options it requires
  app.use('/mock-service', new MockService(options, app));

  // Get our initialized service so that we can register hooks
  const service = app.service('mock-service');

  service.hooks(hooks);
};
