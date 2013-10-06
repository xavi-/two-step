function ParamList(step, name) {
	this._idx = 1;
	this._used = false;
	this.vals = [ null ];
	this.pending = [];
	this.step = step;
	this.name = name;
}
ParamList.prototype = {
	nextIdx: function() {
		var idx = this._idx++;

		this.pending.push(idx);

		return idx;
	},
	checkPending: function() {
		if(!this._used && this.pending.length === 0) {
			this.step.apply(null, this.vals);
			this._used = true;
		}
	},
	done: function(idx, val) {
		for(var i = 0; idx != null && i < this.pending.length; i++) {
			if(this.pending[i] !== idx) { continue; }

			this.pending.splice(i, 1);

			break;
		}

		this.vals[idx] = val;
		this.checkPending();
	},
	error: function(err, info) {
		err.step = info;
		this.vals[0] = err;
		this.step.apply(null, this.vals);
	}
};


function errInfo(stepName, paramIdx, paramName) {
	return { name: stepName, paramIdx: paramIdx, paramName: paramName };
}
function StepObj(params, jumpTo, data) {
	this._params = params;
	this.jumpTo = jumpTo;
	this.data = data;
}
StepObj.prototype = {
	val: function(name) {
		var params = this._params, paramIdx = params.nextIdx();
		return function(err, val) {
			if(err) { return params.error(err, errInfo(params.name, paramIdx, name)); }

			params.done(paramIdx, val);
		};
	},
	valArray: function(name) {
		name = (name || "array");
		var params = this._params, paramIdx = params.nextIdx();
		var arrayVals = new ParamList(function(err) {
			if(err) { return params.error(err, errInfo(params.name, paramIdx, err.step.name)); }

			params.done(paramIdx, arrayVals.vals.slice(1));
		});

		// Handles arrays of zero length
		process.nextTick(function() { arrayVals.checkPending(); });

		return {
			val: function(valName) {
				var valIdx = arrayVals.nextIdx();
				valName = (valName || name + "(" + valIdx + ")");

				return function(err, val) {
					if(err) { return arrayVals.error(err, errInfo("", 0, valName)); }

					arrayVals.done(valIdx, val);
				};
			},
			syncVal: function(val, name) {
				this.val(name)(null, val);
			}
		};
	},
	syncVal: function(val, name) {
		this.val(name)(null, val);
	},
	listen: function(emitter, name) {
		var params = this._params, paramIdx = params.nextIdx();

		var chunks = [];
		emitter.on('data', function (chunk) { chunks.push(chunk); });
		emitter.on('error', function(err) {
			params.error(err, errInfo(params.name, paramIdx, name));
		 });
		emitter.on('end', function() { params.done(paramIdx, chunks); });
	}
};

function TwoStep() {
	var steps =  Array.prototype.slice.call(arguments);
	var curIdx = 0;
	var data = {};

	function jumpTo(func, args) {
		this._params._used = true;

		if (typeof func === 'function') {
			func.apply(this, args);
			return;
		}

		for(var i = 0; i < steps.length; i++) {
			if(steps[i].name !== func) { continue; }

			curIdx = i;

			break;
		}
		if(i === steps.length) { throw Error("Unknown jumpTo location: " + func); }

		process.nextTick(function() { nextStep.apply(null, args); });
	}

	function nextStep(err) {
		// If error occurs in the last test, re-throw exception.
		if(err && curIdx === steps.length) { throw err; }

		if(curIdx >= steps.length) { return; }

		var params = new ParamList(nextStep, steps[curIdx].name);
		var stepObj = new StepObj(params, jumpTo, data);

		try {
			steps[curIdx++].apply(stepObj, arguments);
			params.checkPending(); // Handle case where nothing async occurs in the callback
		} catch(e) {
			params.error(e, { name: steps[curIdx - 1].name });
		}
	}

	nextStep();
}

module.exports = TwoStep;
