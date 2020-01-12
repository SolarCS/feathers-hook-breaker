const errors = require('@feathersjs/errors');
const debug = require('debug')('feathers-opossum');
const { FeathersError } = require('@feathersjs/errors');
const CircuitBreaker = require('opossum');
class Adapder {}
// class Adapder extends Service {}

module.exports.adapter = Adapder;
