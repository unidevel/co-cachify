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
  }

  *getName(postfix){
    var data =  this.prefix +'.'+postfix;
    var value = yield co_sleep(data);
    return value;
  }
}

var test1 = new Test("test1");

var cachedTest1 = cm.cache(test1)
  .enable('getName')
  .done();

co(function*(){
  var value;
  value = yield cachedTest1.getName("value1");
  console.log(value);
  value = yield cachedTest1.getName("value1");
  console.log(value);
}).catch(function(err){
  console.error(err, err.stack);
})
