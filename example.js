'use strict';

var co = require('co');
var cm = require('./index')({name: 'MyApp'});
var co_sleep = function(value){
  return function(callback){
    setTimeout(function(){callback(null,value);}, 1000);
  }
}
class Test {
  constructor(prefix){
    this.prefix = prefix || 'noname';
    this.data = {};
  }

  *simpleTest(postfix){
    var data =  this.prefix +'.'+postfix;
    var value = yield co_sleep(data);
    return value;
  }

  *getData(id){
    var data = this.data[id];
    var value = yield co_sleep(data);
    return value;
  }

  *setData(id, value){
    this.data[id] = value;
  }

  *complexTest(args){
    var data =  'Name: '+args.firstName+'.'+args.lastName;
    var value = yield co_sleep(data);
    return value;
  }
}

var test1 = new Test("test1");
var cachedTest1Meta = cm.cache(test1)
var cachedTest1 = cachedTest1Meta
  .enable('simpleTest')
  .enable('complexTest', {
    ttl: 10,
    hash: function(args){
      return args.firstName+'.'+args.lastName
    }
  })
  .enable('getData', 'data')
  .update('setData', 'data')
  .done();

var now = new Date().getTime();
function log(value){
  var ts = new Date().getTime();
  console.log('Cost '+(ts - now)+'ms', value);
  now = ts;
}

co(function*(){
  yield cachedTest1.setData('id1', 'value1');
  log(yield cachedTest1.getData('id1'));
  log(yield cachedTest1.getData('id1'));
  yield cachedTest1.setData('id1', 'value2');
  log(yield cachedTest1.getData('id1'));
  log(yield cachedTest1.getData('id1'));


  var count = 12;
  for ( var i = 0; i < count; ++i ) {
    if ( i == Math.floor(count / 2) ) {
      console.log('invalid');
      log(yield cachedTest1Meta.invalid().simpleTest("value1"));
      continue;
    }
    log(yield cachedTest1.simpleTest("value1"));
  }
  log(yield cachedTest1.complexTest({firstName:'A', lastName:'B'}));
  log(yield cachedTest1.complexTest({firstName:'A', lastName:'B'}));
  log(yield cachedTest1.complexTest({firstName:'X', lastName:'L'}));
  cachedTest1Meta.disable();
  log(yield cachedTest1.simpleTest("value1"));
  log(yield cachedTest1.simpleTest("value1"));
}).catch(function(err){
  console.error(err, err.stack);
})
