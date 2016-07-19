# co-cachify
----
The goal of co-cachify is to minimize the refactor effort for your current code while enable cache on your project.

For example, assume you have a class as follow:
```javascript
// user.js
class User {
  *getProfile(uid){
    var profile = yield getUserProfileFromDatabase(uid)
    return value;
  }
}
module.exports = new User();

// userservice.js
var user = require('./user');
class UserRestService {
  *get(args){
    var uid = args.uid;
    var profile = yield user.getProfile(uid);
    return profile;
  }
}

```
When you call method get the profile of a user, the getUserProfileFromDatabase may query database and aggregate user information such as name,photo,friends, etc. That may cost some time each time. When you decide to accelerate this service by using cache, you may find that it cause big changes in code structure. But with co-cachify, there will be few changes, and you can separate the change by adding a new file. Here is the code to enable cache(Only changes):
```javascript
...
// userservice.js
var userNotCached = require('./user');
// Register cached object and methods
var cacheManager = require('co-cachify')({name: 'MyApp'});
var user = cacheManager.cache(userNotCached)
  .enable('getProfile')
  .done();
...
```
By this example, you can see how easy it is to enable cache on your code.


## Installation
```shell
npm install co-cachify
```
