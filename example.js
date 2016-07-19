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

  *getWord(word){
    var data =  'Hello '+word;
    var value = yield co_sleep(data);
    return value;
  }
}

var test1 = new Test("test1");

var cachedTest1 = cm.cache(test1)
  .enable('getName')
  .done();

var now = new Date().getTime();
function log(value){
  var ts = new Date().getTime();
  console.log('Cost '+(ts - now)+'ms', value);
  now = ts;
}

co(function*(){
  for ( var i = 0; i < 10; ++i ) {
    log(yield cachedTest1.getName("value1"));
  }
  log(yield cachedTest1.getName("value2"));
  log(yield cachedTest1.getName("value2"));
  log(yield cachedTest1.getWord("word1"));
  log(yield cachedTest1.getWord("word1"));
}).catch(function(err){
  console.error(err, err.stack);
})
