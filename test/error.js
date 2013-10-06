var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");

var callbackErr = new Error("Catch me!"), explicitErr = new Error("Catch me too!");

var tests = {
	expected: 1,
	executed: 0,
	finished: function() { tests.executed++; }
};
process.on("exit", function() {
	assert.equal(tests.executed, tests.expected);
	console.log("All done.  Everything passed.");
});

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
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("valueErr")(data);
		check.coverage([ "valueErr", "explictThrow", "catchException" ])(data);
		check.order([ "valueErr", "explictThrow", "catchException" ])(data);

		err = data["explictThrow"].args[0];
		assert.equal(err, callbackErr, "Callback error wasn't replayed correctly");
		assert.ok(err.step, "Step info object wasn't added to error");
		assert.equal(err.step.name, "valueErr", "Incorrect step name specified in error obj");
		assert.equal(
			err.step.paramName, "faulty-param", "Incorrect param name specified in error obj"
		);
		assert.equal(err.step.paramIdx, 1, "Incorrect param index specified in error obj");

		err = data["catchException"].args[0];
		assert.equal(err, explicitErr, "Callback error wasn't replayed correctly");
		assert.ok(err.step, "Step info object wasn't added to error");
		assert.equal(err.step.name, "explictThrow", "Incorrect step name specified in error obj");
		assert.equal(err.step.paramName, undefined, "Incorrect param name specified in error obj");
		assert.equal(err.step.paramIdx, undefined, "Incorrect param index specified in error obj");

		tests.finished();
	}
);

assert.throws(function() {
	TwoStep(
		function first() { },
		function lastErr() { throw "Last Error Thrown"; }
	);
}, "Last Error Thrown");
assert.throws(function() {
	TwoStep(
		function first() { this.jumpTo("no-where"); }
	);
}, "Error thrown when trying to jumpTo unknow function name.");
assert.throws(function() {
	TwoStep(
		function first() { this.jumpTo(5); }
	);
}, "Error thrown when trying to jumpTo unknow function index.");
assert.throws(function() {
	TwoStep(
		function first() { this.jumpTo(null); }
	);
}, "Error thrown when trying to jumpTo unknow function.");