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
}

var cacheHandle = {
  get: function(target, name){
    var config = registry.get(target);
    var proxyMethod = config.methods[name];
    return proxyMethod || target[name];
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
  if ( !def.ttl ) cacheDef.ttl = this.config.ttl;
  if ( !def.hash ) cacheDef.hash = function(arg0){
    return arg0 || '';
  }
  var adapter = this.adapter;
  cacheDef.func = func;
  cacheDef.name = cacheKey(config.name, method);
  methods[method] = function*(){
    var hash = cacheDef.hash.apply(obj, arguments);
    var key = cacheKey(cacheDef.name, hash);
    var value = yield adapter.get(key);
    if ( value == null ) {
      var thunk = func.apply(obj, arguments);
      value = yield thunk;
      if ( value != null ) {
        yield adapter.set(key, value, cacheDef.ttl);
      }
    }
    return value;
  }
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
      done: function(){
        return proxy;
      }
    }
    return register;
  }
}

module.exports = function(args){
  return new CacheManager(args);
}
