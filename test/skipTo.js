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
					this.skipTo("last");
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
			assert.ok(!data["skip"], "The skip callback was executed");
		}
	}
}).export(module);