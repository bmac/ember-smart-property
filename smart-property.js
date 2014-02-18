(function() {
  var get = Ember.get;
  var outerComputed = [],
      currentComputed;

  var dependencyDetection = {
    begin: function(computed) {
      if (currentComputed) {
        outerComputed.push(currentComputed);
      }
      currentComputed = {
        computed: computed,
        seen: new Ember.Map()
      };
    },
    end: function() {
      currentComputed = outerComputed.pop();
    },

    registerDependency: function(obj, prop, value) {

      if (!currentComputed) {
        return;
      }
      var path = prop;

      if (Ember.isArray(value)) {
        path = path + '.[]';
      }
      // 
      var prevPath = currentComputed.seen.get(obj);
      if (prevPath) {
        path = prevPath + '.' + path;
      }
      
      if (value && typeof value === 'object') {
        currentComputed.seen.set(value, path);
      }

      currentComputed.computed._dependentKeys.push(path);
    }
  };


  var SmartComputed = function(func) {
    Ember.ComputedProperty.call(this, func);
  };

  SmartComputed.prototype = new Ember.ComputedProperty();

  var originalComputedGet = Ember.ComputedProperty.prototype.get;
  SmartComputed.prototype.get = function(obj, keyName) {
    if (this._cacheable) {
      var meta = Ember.meta(obj);
      var cache = meta.cache;
      if (keyName in cache) {
        return cache[keyName];
      }
    }
    this._dependentKeys = [];
    dependencyDetection.begin(this);
    var ret = originalComputedGet.apply(this, arguments);
    dependencyDetection.end();
    return ret;
  };

  var originalComputedSet = Ember.ComputedProperty.prototype.set;
  SmartComputed.prototype.set = function() {
    this._dependentKeys = [];
    dependencyDetection.begin(this);
    var ret = originalComputedSet.apply(this, arguments);
    dependencyDetection.end();
    return ret;
  };


  var SmartProp = window.SmartProp = {};
  SmartProp.SmartComputed = SmartComputed;

  var computed = SmartProp.computed = function(func) {
    if (typeof func !== "function") {
      throw new Ember.Error("Smart Computed Property declared without a property function");
    }

    var cp = new SmartComputed(func);

    return cp;
  };

  if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Function) {
    Function.prototype.smartProperty = function() {
      var ret = SmartProp.computed(this);
      // ComputedProperty.prototype.property expands properties; no need for us to
      // do so here.
      return ret.property.call(ret);
    };
  }

  SmartProp.get = function(obj, keyName) {
    if (!keyName && 'string'===typeof obj) {
      keyName = obj;
      obj = null;
    }
    var ret = get(obj, keyName);
    dependencyDetection.registerDependency(obj, keyName, ret);
    return ret;
  };

  
  if (typeof Ember.ENV.SMART_PROP_EXTEND_OBJECT_GET === 'undefined' && 
      typeof Ember.ENV.SMART_PROP_EXTEND_EMBER === 'undefined') {
    Ember.ENV.SMART_PROP_EXTEND_OBJECT_GET = true;
  }
  if (Ember.ENV.SMART_PROP_EXTEND_EMBER || Ember.ENV.SMART_PROP_EXTEND_OBJECT_GET) {
    Ember.Object.reopen({
      get: function(keyName) {
        return SmartProp.get(this, keyName);
      }
    });
  }
  
  if (typeof Ember.ENV.SMART_PROP_EXTEND_EMBER_GET === 'undefined' &&
      typeof Ember.ENV.SMART_PROP_EXTEND_EMBER === 'undefined') {
    Ember.ENV.SMART_PROP_EXTEND_EMBER_GET = true;
  }
  if (Ember.ENV.SMART_PROP_EXTEND_EMBER || Ember.ENV.SMART_PROP_EXTEND_EMBER_GET) {
    Ember.get = SmartProp.get;
  }
}());
