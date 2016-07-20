'use strict';
var Reflect = require('harmony-reflect');
var registry = new WeakMap();
const DEFAULT_TTL = 60 * 1000;

class MemoryCacheAdapter {
  constructor(){
    this.cache = {};
  }

  *get(key){
    var data = this.cache[key];
    if ( !data ) return null;
    var duration = new Date().getTime() - data.timestamp;
    if ( duration > data.ttl ) return null;
    return data.value;
  }

  *set(key, value, ttl){
    var data = {
      value: value,
      timestamp: new Date().getTime(),
      ttl: ttl
    };
    this.cache[key] = data;
  }

  *delete(key){
    delete this.cache[key];
    return;
  }
}

var cacheHandle = {
  get: function(target, name, receiver){
    var config = registry.get(target);
    var cacheDef = config.methods[name];
    if (config.clearCacheOnNextCall && cacheDef) {
      cacheDef.clearCacheOnNextCall = true;
      delete config.clearCacheOnNextCall;
    }
    return (cacheDef && cacheDef.proxy) || target[name];
  }
}

function cacheKey(){
  return Array.prototype.join.call(arguments, '/');
}

function enableCache(obj, method, def){
  def = def || {};
  var config = registry.get(obj);
  if ( typeof method != 'string' ) throw new Error('Enable cache must provide method name!');
  var func = obj[method];
  if ( typeof func != 'function' ) throw new Error('Function ['+method+'] not found on target!');
  var methods = config.methods;
  var cacheDef = Object.assign({}, def);
  methods[method] = cacheDef;
  if ( !def.ttl ) cacheDef.ttl = this.config.ttl;
  if ( !def.hash ) cacheDef.hash = function(arg0){
    return arg0 || '';
  }
  var adapter = this.adapter;
  cacheDef.func = func;
  cacheDef.name = cacheKey(config.name, method);
  cacheDef.proxy = function*(){
    var hash = cacheDef.hash.apply(obj, arguments);
    var key = cacheKey(cacheDef.name, hash);
    var deleted = false;
    var value = null;
    if ( cacheDef.clearCacheOnNextCall ) {
      delete cacheDef.clearCacheOnNextCall;
      yield adapter.delete(key);
      deleted = true;
    }
    else {
      value = yield adapter.get(key);
    }
    if ( value == null ) {
      var thunk = func.apply(obj, arguments);
      value = yield thunk;
      if ( value != null ) {
        yield adapter.set(key, value, cacheDef.ttl);
      }
      else {
        if ( !deleted ) yield adapter.delete(key);
      }
    }
    return value;
  }
}

function disableCache(obj, method){
  var config = registry.get(obj);
  if ( !config ) return;
  if ( !method ) {
    //registry.delete(obj);
    config.methods = {};
    return config;
  }
  var methods = config.methods;
  var methodConfig = methods[method];
  delete methods[method];
  return methodConfig;
}


class CacheManager {
  constructor(args){
    if ( !args || !args.name ) throw new Error('cache manager must be initialized with app name!');
    this.name = args.name;
    this.adapter = args.adapter || new MemoryCacheAdapter();
    this.config = {
      ttl: args.ttl || DEFAULT_TTL
    }
  }

  cache(obj, cacheName) {
    if ( !cacheName ) {
      cacheName = obj.name;
    }
    if ( !cacheName ) {
      var proto = Object.getPrototypeOf(obj);
      cacheName = proto && proto.constructor && proto.constructor.name;
    }
    if ( typeof cacheName != 'string' ) {
      throw new Error('cache name must be provided!')
    }
    var proxy = new Proxy(obj, cacheHandle);
    var config = {
      name: cacheKey(this.name, cacheName),
      methods: {}
    };
    var that = this;
    registry.set(obj, config);
    var register = {
      enable: function(method, def){
        enableCache.call(that, obj, method, def);
        return this;
      },
      invalid: function(){
        config.clearCacheOnNextCall = true;
        return proxy;
      },
      disable: function(method){
        disableCache.call(that, obj, method);
        return this;
      },
      done: function(){
        return proxy;
      }
    }
    return register;
  }
}

module.exports = function getCachifyInstance(args){
  var instance = new CacheManager(args);
  return instance;
}
