# TwoStep

TwoStep is the spiritual successor of [Step](https://github.com/creationix/step) with better error handling and finer flow control.  Much of the inspiration and direction for this project came from this gist: https://gist.github.com/1524578

## The API and Examples

The `TwoStep` function takes any number of callbacks as parameters.  By default, the callbacks are executed one right after another in the sequence they were passed in.  The goal is to reduce the nesting that commonly occurs when chaining several asynchronous functions.  The `this` pointer in each callback is a object with the following api:

- **this.val([param-name])** -- returns a callback that expects an error object (or null if no error occurred) as the first parameter and a results as the second parameter.  Note, this function (as well most other functions in this API) can be called multiple time in a single callback.  Each `this.val` call corresponds to an addition parameter passed to the next callback.  For example, here's how `this.val` can be used to asynchronously read in two files:

	```javascript
	TwoStep(
		function readSelf() {
			fs.readFile("./my-file1.txt", this.val("file1"));
			fs.readFile("./my-file2.txt", this.val("file2"));
		},
		function(err, text1, text2) {
			// text1 is the contents for my-file1.txt
			// text2 is the contents for my-file2.txt
		}
	);
	```
An optional string parameter can passed in to `this.val` as well.  This string can aid with error handling and debugging. (See Error Handleing section)  Note nearly every function in `TwoStep` takes the same optional string as the final parameter.
- **this.syncVal(value, [param-name])** -- used to pass a synchronously calulated result to the next callback.  Here's an example of how it could be used:

	```javascript
	var userId = /* ...  some value ... */;
	TwoStep(
		function getProfile() {
			if(userId in profileCache) {
				this.syncVal(profileCache[userId]);
			} else {
				profileDB.get(userId, this.val());
			}
		},
		function renderProfile(err, profile) { /* ... render it ... */ }
	);
	```
- **this.valArray([param-name])** -- used when there are a variable number of callbacks.  Returns an object with two functions: `obj.val` and `obj.syncVal`.  These two function work very similar to the top level `this.val` and `this.syncVal` in that calling either results in another item being placed in a list.  This is useful, for example, when you need to retrieve multiple user profiles from a database:

	```javascript
	var userIds = [ /* ... list of ids ... */ ];
	TwoStep(
		function getProfiles() {
			var profiles = this.valArray();

			for(var i = 0; i < userIds.length; i++) {
				var userId = userIds[i];

				if(userId in profileCache) {
					profiles.syncVal(profileCache[userId]);
				} else {
					profileDB.get(userId, profiles.val());
				}
			}
		},
		function renderProfiles(err, profiles) { /* ... render it ... */ }
	);
	```
- **this.data** -- an persistent object that is available to each TwoStep callback.

	```javascript
	TwoStep(
		function parseUser() { this.data.userId = "123"; },
		function getProfile(err, user) { /* get the profile */ },
		function renderProfile(err, profile) {
			// this.data.userId === "123"
		}
	);
	```
- **this.listen(EventEmitter, [param-name])** -- a convenience function that takes an event emitter and listens for `data`, `error` and `end` events on it, then passes the results to the next callback.

	```javascript
	TwoStep(
		function() { // Accumulates data from stdin
			this.listen(process.stdin); // Listens for the data, error, end events
		},
		function(err, chunks) {
			// chunks is arrays of buffers/strings emitted during the "data" event
		}
	);
	```
- **this.jumpTo(string, [argsArray])** -- allows you to jump to any named function in the current step chain
- **this.jumpTo(function, [argsArray])** -- exits the current step chain and asynchronously call an outside function

	```javascript
	function badNews(err) {
		// Damage control...
	}

	TwoStep(
		function parseData() { /* ... something ... */ },
		function modifyUserData(err, val) {
			if(err.message === "expired key") { return this.jumpTo("cleanup", [ err ]); }
			// Modify user data
		},
		function saveData(err, val) {
			// Completely stops the Step chain
			// calls `badNews` function with `err` as args list
			if(err) { return this.jumpTo(badNews, [ err ]); }
			// ...
		},
		function cleanUp(err, val) {
			if(err.message === "expired key") { /* Prune stale cache */ }
			// Invalidate keys
		}
	);
	```

See `test/*.js` for more working examples.

### Error Handling

In the hopes to improve debuggability, TwoStep allows users to give each callback a name.  When and if an error occurs this name (along with other information) is used to create a "step info object" which is then attatched to the original error object.  The "step info object" contains the name of the callback, which step the exception occurred as well the index of the parameter that was being calculated.  Here's an example:

```javascript
TwoStep(
	function callDB() {
		userdb.get(userId, this.val("user-data"));
		productdb.get(productId, this.val("product-data"));
	},
	function processPage(err, user, product) {
		if(err) {
			// err.step === { name: "callDB", paramName: "user-data", paramIdx: 1 }
		}

		/* ... process page ... */
	},
	// ...
);
```

Every TwoStep function (with the exception of `jumpTo`) takes an optional string as the final parameter.  This string is used to set the `paramName` property on the "step info object".

## Getting TwoStep

The easiest way to get TwoStep is with [npm](http://npmjs.org/):

	npm install two-step

Alternatively you can clone this git repository:

	git clone git://github.com/xavi-/two-step.git

## Developed by
* Xavi Ramirez

## License
This project is released under [The MIT License](http://www.opensource.org/licenses/mit-license.php).
