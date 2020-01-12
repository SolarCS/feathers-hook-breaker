const feathers = require('@feathersjs/feathers');
const memory = require('feathers-memory');
// console.log('memory', memory());
// console.log('memory', memory.Service);
//const { adapter } = require('../lib');
const app = feathers();

// const newService = memory.Service.extend({
//   get: function(id, params, callback) {
//     this._super(id, params, callback);
//   }
// });
class MyService extends memory.Service {
  constructor(serviceOptions, opossumOptions) {
    super(serviceOptions);
  }
  find(params) {
    return super.find(params);
  }

  create(data, params) {
    data.created_at = new Date();

    return super.create(data, params);
  }

  update(id, data, params) {
    data.updated_at = new Date();

    return super.update(id, data, params);
  }
}

app.use(
  '/todos',
  new MyService({
    paginate: {
      default: 2,
      max: 4
    }
  })
);

app
  .service('todos')
  .find({})
  .then(res => console.log(res))
  .catch(err => console.log(err));
console.log('end');
