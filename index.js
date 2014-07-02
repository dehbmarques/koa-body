/*!
 * koa-body <https://github.com/dlau/koa-body>
 * A koa body parser middleware with support for `multipart/form-data`,
 * `application/json` or `application/x-www-form-urlencoded` request bodies.
 * 
 * Copyright (c) 2014 Charlike Mike Reagent, Daryl Lau, contributors.
 * Released under the MIT license.
 */

'use strict';

/**
 * Module dependencies.
 */

var buddy = require('co-body');
var forms = require('formidable');
var xtend = require('extend');

var defaultOptions = {
  patchNode: false,
  patchKoa: true,
  multipart: false,
  encoding: 'utf-8',
  jsonLimit: '1mb',
  formLimit: '56kb',
  formidable: {
    multiples: true,
    keepExtensions: true,
    maxFields: 10,
  }
};

/**
 * Parsing request bodies
 * 
 * @param {Object} options
 * @return {GeneratorFunction}
 * @api public
 */
module.exports = function koaBody(options) {
  var opts = xtend(true, defaultOptions, options || {});
  
  return function* koaBody(next){
    var body = {}, json, form;
    if (this.request.is('json'))  {
      json = yield buddy.json(this, {encoding: opts.encoding, limit: opts.jsonLimit});
      body.fields = json;
    }
    else if (this.request.is('urlencoded')) {
      form = yield buddy.form(this, {encoding: opts.encoding, limit: opts.formLimit});
      body.fields = form;
    }
    else if (this.request.is('multipart') && opts.multipart) {
      body = yield formy(this, opts.formidable);
    }

    if (opts.patchNode) {
      this.req.body = body;
    }
    if (opts.patchKoa) {
      this.request.body = body;
    }
    yield next;
  };
};

/**
 * Doneable formidable
 * 
 * @param  {Stream} ctx
 * @param  {Object} opts
 * @return {Function} Node-style callback, ready for yielding
 * @api private
 */
function formy(ctx, opts) {
  return function(done) {
    var form = new forms.IncomingForm(opts)
    form.parse(ctx.req, function(err, fields, files) {
      if (err) return done(err)
      done(null, {fields: fields, files: files})
    })
  }
}
