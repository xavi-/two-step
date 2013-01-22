var assert = require("assert");

module.exports = {
	save: function(stepObj, args) {
		stepObj.data.callSeq = stepObj.data.callSeq || [];
		stepObj.data.callSeq.push(stepObj._params.name);
		stepObj.data[stepObj._params.name] = { when: Date.now(), args: Array.prototype.slice.call(args) };
	},
	coverage: function(names) {
		return function(data) {
			names.forEach(function(name) { assert.ok(data[name], name + " not executed"); });
		};
	},
	order: function(names) {
		return function(data) {
			names.forEach(function(name) {
				assert.ok(data[name] != null, "Unknown function name: '" + name + "'");
			});
			assert.deepEqual(
				data.callSeq,
				names,
				"Functions were not called in order:\n\t\texpected: " + names + "\n\t\tactual: " + data.callSeq
			);
		};
	},
	emptyArgs: function(name) {
		return function(data) {
			assert.ok(data[name] != null, "Unknown function name: '" + name + "'");
			assert.equal(data[name].args.length, 0, name + " didn't have empty args");
		};
	}
};
