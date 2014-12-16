// Rig reactive ready var
var _ready = new ReactiveVar(false);

Cordova = function(options) {
  var self = this;
  options = options || { version: '1.0.0'};

  self.isReady = function() {
    return _ready.get();
  };

  self.addEventListener = function(eventId, callback) {
    if (typeof callback !== 'function') {
      throw new Error('ERROR: Cordova.addEventListener expects callback as function');
    }

    // Rig normal event listener
    return document.addEventListener(eventId, callback);

  };

  // Listen for deviceready event
  self.addEventListener('deviceready', function() {
    // Set the ready flag
    _ready.set(true);
  });

  self.call = function(name, args, callback) {
    // console.log('### Call: ' + name);
    if (name == 'version') {
      callback('');
    } else if (name == 'shellVersion') {
      callback(options.version);
    } else if (name == 'patchVersion') {
      callback('2')
    } else {
      // device
      var ref = window[name];
      //
      if (typeof ref == 'function') {
        if (callback) {
          callback(ref.apply(window, args));
        } else {
          ref.apply(window, args);
        }
      } else {
        if (callback) callback(ref);
      }
    }

  };

};
