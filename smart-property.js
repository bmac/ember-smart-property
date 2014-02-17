(function() {
    var outerComputed = [],
        currentComputed;

    function begin(computed) {
        if (currentComputed) {
            outerComputed.push(currentComputed);
        }
        currentComputed = computed;
    }

    function end() {
        currentComputed = outerComputed.pop();
    }

    function registerDependency(dependency) {
        if (currentComputed) {
            var meta = Ember.meta(currentComputed);
            meta.desc._dependentKeys.push(dependency);
        }
    }


    var dependencyDetection = {
        begin: begin,
        end: end,
        registerDependency: registerDependency
    };




    var originalGet = Ember.get;
    Ember.get = function(object, path) {
        dependencyDetection.registerDependency(path);
        originalGet.apply(this, arguments);
    };


    var SmartComputed = Ember.ComputedProperty;

    SmartComputed.prototype = new Ember.ComputedProperty();


    var originalComputedGet = Ember.ComputedProperty.prototype.get;
    SmartComputed.prototype.get = function(obj, keyName) {
        if (this._cacheable) {
            var meta = Ember.meta(obj);
            meta.desc._dependentKeys = [];
            dependencyDetection.begin(this);
            originalComputedGet.apply(this, arguments);
            dependencyDetection.end();
        } else {
            originalComputedGet.apply(this, arguments);
        }
    };


    window.smartComputed = function(func) {
        var args;

        if (arguments.length > 1) {
            args = [].slice.call(arguments, 0, -1);
            func = [].slice.call(arguments, -1)[0];
        }

        if (typeof func !== "function") {
            throw new Ember.Error("Computed Property declared without a property function");
        }

        var cp = new SmartComputed(func);

        if (args) {
            cp.property.apply(cp, args);
        }

        return cp;
    };

}());
