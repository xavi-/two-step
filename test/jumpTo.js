var vows = require("vows");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

vows.describe("Test `this.val`").addBatch({
	"basic test passing one param": {
		topic: function() {
			TwoStep(
				function start(err) {
					debugger;
					check.save(this, arguments);
					this.jumpTo("last", [ err, "hello" ]);
				},
				function skip(err) {
					check.save(this, arguments);
					throw "This callback should not be executed."
				},
				function last(err) {
					check.save(this, arguments);
					this.syncVal(this.data);
				},
				this.callback
			)
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
	}
}).export(module);