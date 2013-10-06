var assert = require("assert");
var TwoStep = require("../");
var check = require("./basic-checks");
var EventEmitter = require("events").EventEmitter;

var tests = {
	expected: 2,
	executed: 0,
	finished: function() { tests.executed++; }
};
process.on("exit", function() {
	assert.equal(tests.executed, tests.expected);
	console.log("All done.  Everything passed.");
});

TwoStep(
	function calls() {
		check.save(this, arguments);

		var evt = new EventEmitter();

		this.listen(evt);

		setTimeout(function() { evt.emit("data", "one"); }, 0);
		setTimeout(function() { evt.emit("data", "two"); }, 1);
		setTimeout(function() { evt.emit("data", "three"); }, 2);
		setTimeout(function() { evt.emit("end"); }, 3);
	},
	function results(err, chunks) {
		if(err) { throw err; }

		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("calls")(data);
		check.coverage([ "calls", "results" ])(data);
		check.order([ "calls", "results" ])(data);
		assert.deepEqual(data["results"].args[1], [ "one", "two", "three" ]);

		tests.finished();
	}
);

TwoStep(
	function calls() {
		check.save(this, arguments);

		var evt = new EventEmitter();

		this.listen(evt, "emitter-param");

		setTimeout(function() { evt.emit("data", "one"); }, 0);
		setTimeout(function() { evt.emit("data", "two"); }, 1);
		setTimeout(function() { evt.emit("data", "three"); }, 2);
		setTimeout(function() { evt.emit("error", { message: "emitted error" }); }, 3);
	},
	function results(err, chunks) {
		check.save(this, arguments);

		this.syncVal(this.data);
	},
	function done(err, data) {
		if(err) { throw err; }

		check.emptyArgs("calls")(data);
		check.coverage([ "calls", "results" ])(data);
		check.order([ "calls", "results" ])(data);

		err = data["results"].args[0];
		assert.ok(err, "Error was not detected");
		assert.ok(err.step, "Step info object was not added");
		assert.equal(err.message, "emitted error");
		assert.equal(err.step.name, "calls", "Incorrect step name specified in error obj");
		assert.equal(
			err.step.paramName, "emitter-param", "Incorrect param name specified in error obj"
		);
		assert.equal(err.step.paramIdx, 1, "Incorrect param index specified in error obj");

		tests.finished();
	}
);
