var vows = require("vows");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

vows.describe("Test `this.val`").addBatch({
	"basic test passing function name and one param": {
		topic: function() {
			TwoStep(
				function start(err) {
					check.save(this, arguments);
					this.jumpTo("last", [ err, "hello" ]);
				},
				function skip(err) {
					check.save(this, arguments);
				},
				function last(err) {
					check.save(this, arguments);
					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("start"),
		"correct callbacks were called": check.coverage([ "start", "last" ]),
		"callbacks executed in order": check.order([ "start", "last" ]),
		"correct callback were skipped": function(data) {
			assert.ok(!data["skip"], "The skipped callback was executed");
		},
		"check arguments of recieving function": function(data) {
			assert.ok(!data["last"].args[0], "The error argument was incorrectly set");
			assert.equal(data["last"].args[1], "hello", "The incorrect arguments were sent");
		}
	},
	"test that step chain continues once a jumpTo is executed": {
		topic: function() {
			TwoStep(
				function first(err) {
					check.save(this, arguments);
					this.jumpTo("fourth", [ err, "go to fourth" ]);
				},
				function second(err) {
					check.save(this, arguments);
					this.syncVal("foo")
				},
				function third(err) {
					check.save(this, arguments);
					this.jumpTo("fifth", [ err, "go to fifth" ]);
				},
				function fourth(err) {
					check.save(this, arguments);
					this.jumpTo("second", [ err, "go to second" ]);
				},
				function fifth(err) {
					check.save(this, arguments);
					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("first"),
		"correct callbacks were called": check.coverage([ "first", "second", "third", "fourth", "fifth" ]),
		"callbacks executed in order": check.order([ "first", "fourth", "second", "third", "fifth" ]),
		"check arguments of recieving function": function(data) {
			assert.ok(!data["second"].args[0], "The error argument was incorrectly set");
			assert.equal(data["second"].args[1], "go to second", "The incorrect arguments were sent");
			assert.equal(data["third"].args[1], "foo", "The incorrect arguments were sent");
			assert.equal(data["fourth"].args[1], "go to fourth", "The incorrect arguments were sent");
			assert.equal(data["fifth"].args[1], "go to fifth", "The incorrect arguments were sent");
		}
	},
	"bail out if a function was specified": {
		topic: function() {
			var callback = this.callback;

			function exit() {
				this.data.exited = true;
				this.data.exitArgs = Array.prototype.slice.call(arguments);
				callback(null, this.data);
			}
			TwoStep(
				function start() {
					check.save(this, arguments);
					this.jumpTo(exit, ['foo', 'bar', 'baz']);
				},
				function skip1() {
					check.save(this, arguments);
				},
				function skip2() {
					check.save(this, arguments);

					this.syncVal(this.data);
				},
				callback
			);
		},
		"no args to first callback": check.emptyArgs("start"),
		"correct callbacks were called": check.coverage([ "start" ]),
		"correct callback were skipped": function(data) {
			assert.ok(!data["skip1"], "First skipped callback was executed");
			assert.ok(!data["skip2"], "Second skipped callback was executed");
		},
		"correct callbacks were called": function(data) {
			assert.ok(data.exited, "External jumpTo function was executed.");
		},
		"correct arguments were passed to external function": function(data) {
			assert.deepEqual(data.exitArgs, ['foo', 'bar', 'baz']);
		}
	}
}).export(module);
