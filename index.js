/**
 * koa-body - index.js
 * Copyright(c) 2014
 * MIT Licensed
 *
 * @author  Daryl Lau (@dlau)
 * @author  Charlike Mike Reagent (@tunnckoCore)
 * @api private
 */

'use strict';

/**
 * Module dependencies.
 */

var buddy = require('co-body');
var forms = require('formidable');

/**
 * Expose `requestbody()`.
 */

module.exports = requestbody; 

/**
 *
 * @param {Object} options
 * @see https://github.com/dlau/koa-body
 * @api public
 */
function requestbody(opts) {
  opts = opts || {};
  opts.patchNode = 'patchNode' in opts ? opts.patchNode : false;
  opts.patchKoa  = 'patchKoa'  in opts ? opts.patchKoa  : true;
  opts.multipart = 'multipart' in opts ? opts.multipart : false;
  opts.encoding  = 'encoding'  in opts ? opts.encoding  : 'utf-8';
  opts.jsonLimit = 'jsonLimit' in opts ? opts.jsonLimit : '1mb';
  opts.formLimit = 'formLimit' in opts ? opts.formLimit : '56kb';
  opts.formidable = 'formidable' in opts ? opts.formidable : {};
  opts.parseFormDataToObject = 'parseFormDataToObject' in opts ? opts.parseFormDataToObject : false;

  return function *(next){
    var body = {};
    if (this.is('json'))  {
      body = yield buddy.json(this, {encoding: opts.encoding, limit: opts.jsonLimit});
    }
    else if (this.is('urlencoded')) {
      body = yield buddy.form(this, {encoding: opts.encoding, limit: opts.formLimit});
    }
    else if (opts.multipart && this.is('multipart')) {
      if (opts.parseFormDataToObject) {
        body = yield formyToObject(this, opts.formidable);
      }
      else {
        body = yield formy(this, opts.formidable);
      }
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
 * Donable formidable
 * 
 * @param  {Stream} ctx
 * @param  {Object} opts
 * @return {Object}
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

/**
 * Donable formidable
 * 
 * @param  {Stream} ctx
 * @param  {Object} opts
 * @return {Object}
 * @api private
 */
function formyToObject(ctx, opts) {
  return function(done) {
    var form = new forms.IncomingForm(opts);
    var fieldsArray = [];

    form.on('field', function(name, value) {
      fieldsArray.push({name: name, value: value});
    });

    form.on('file', function(name, value) {
      fieldsArray.push({name: name, value: value});
    });

    form.on('end', function () {

      var fields = {};

      fieldsArray.sort(function (a, b) {
        if(a.name < b.name) return -1;
        if(a.name > b.name) return 1;
        return 0;
      });

      fieldsArray.forEach(function (item) {
        var name = item.name;
        var value = item.value;

        var _fields = fields;
        name.replace(/\]/g, '').split('[').forEach(function (part, i, parts) {

          var nextPart = parts[i+1];
          var isArray = nextPart === '' || !isNaN(parseInt(nextPart));

          if (part === '') {
            part = _fields.length;
          }

          part = isNaN(parseInt(part)) ? part : parseInt(part);

          if (_fields[part] === undefined) {
            _fields[part] = isArray ? [] : {};
          }

          if (i == parts.length-1) {
            _fields[part] = value;
          }

          _fields = _fields[part];
        });
      });

      done(null, fields);
    });

    form.on('error', function (err) {
      return done(err);
    });

    form.parse(ctx.req);
  };
}