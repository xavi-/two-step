var fs = require("fs");
var vows = require("vows");
var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

var callbackErr = new Error("Catch me!"), explicitErr = new Error("Catch me too!");
vows.describe("Test error handling").addBatch({
	"throwing and catching exceptions": {
		topic: function() {
			TwoStep(
				function valueErr() {
					check.save(this, arguments);
					var callback = this.val("faulty-param");
					setTimeout(function () { callback(callbackErr); }, 0);
				},
				function explictThrow(err) {
					check.save(this, arguments);
					throw explicitErr;
				},
				function catchException(err) {
					check.save(this, arguments);

					this.syncVal(this.data);
				},
				this.callback
			);
		},
		"no args to first callback": check.emptyArgs("valueErr"),
		"every step called": check.coverage([ "valueErr", "explictThrow", "catchException" ]),
		"steps called in order": check.order([ "valueErr", "explictThrow", "catchException" ]),
		"catch callback error": function(data) {
			var err = data["explictThrow"].args[0];
			assert.equal(err, callbackErr, "Callback error wasn't replayed correctly");
			assert.ok(err.step, "Step info object wasn't added to error");
			assert.equal(err.step.name, "valueErr", "Incorrect step name specified in error obj");
			assert.equal(err.step.paramName, "faulty-param", "Incorrect param name specified in error obj");
			assert.equal(err.step.paramIdx, 1, "Incorrect param index specified in error obj");
		},
		"catch random exception": function(data) {
			var err = data["catchException"].args[0];
			assert.equal(err, explicitErr, "Callback error wasn't replayed correctly");
			assert.ok(err.step, "Step info object wasn't added to error");
			assert.equal(err.step.name, "explictThrow", "Incorrect step name specified in error obj");
			assert.equal(err.step.paramName, undefined, "Incorrect param name specified in error obj");
			assert.equal(err.step.paramIdx, undefined, "Incorrect param index specified in error obj");
		}
	},
	"throwing in last step": {
		topic: function() { return TwoStep; },
		"error in last step throws error": function(TwoStep) {
			assert.throws(function() {
				TwoStep(
					function first() { },
					function lastErr() { throw "Last Error Thrown"; }
				);
			}, "Last Error Thrown");
		}
	}
}).export(module);