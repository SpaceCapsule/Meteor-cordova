/*

Meteor - Cordova

It's a small interface for external meteor to communicate with native cordova
and events


arguments:

  meteorUrl - url to remote meteor

  options = {
    version - app shell version
    appcache - should we rely on appcache
    onload(e, callbackUrlFlag) - callback for when the iframe is loaded with
    meteor or fallbackUrl (if callbackUrlFlag == true)
    fallbackUrl - if load check fails then this url is called
    debug - true or false - true then write to console on errors
  }

  .load([ callback ])
  callback(error) - is called at load test time - if appcache is relyed on then
                    this is call immediately

  .onError can be overwritten if wanting custom functionality - default is to
  fallback on error

*/


if(!Array.isArray) {
  Array.isArray = function (vArg) {
    return Object.prototype.toString.call(vArg) === '[object Array]';
  };
}

EJSON = {};

EJSON.newBinary = function (len) {
  if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined') {
    var ret = [];
    for (var i = 0; i < len; i++) {
      ret.push(0);
    }
    ret.$Uint8ArrayPolyfill = true;
    return ret;
  }
  return new Uint8Array(new ArrayBuffer(len));
};

EJSON.isBinary = function (obj) {
  return !!((typeof Uint8Array !== 'undefined' && obj instanceof Uint8Array) ||
    (obj && obj.$Uint8ArrayPolyfill));
};

EJSON.isGlobal = function (vArg) {
  return Object.prototype.toString.call(vArg) === '[object global]';
};

EJSON.emptyFunction = function() {};

EJSON.clone = function (v /* list of parents */) {
  // How deep should we go
  var maxLevel = 4;

  // Check for circular references
  if (typeof arguments !== 'undefined') {
    if (arguments.length > maxLevel) {
      return EJSON.emptyFunction;
    }
    for (var i = 1; i < arguments.length; i++) {
      if (v === arguments[i]) {
        return EJSON.emptyFunction; //function() {}; // If JSON.stringify it'll be left out
      }
    }
  }

  if (EJSON.isGlobal(v)) {
    return EJSON.emptyFunction; //function() {}; // If JSON.stringify it'll be left out
  }

  var ret;
  if (typeof v !== 'object') {
    return v;
  }
  if (v === null) {
    return null; // null has typeof "object"
  }
  if (v instanceof Date) {
    return new Date(v.getTime());
  }
  if (EJSON.isBinary(v)) {
    ret = EJSON.newBinary(v.length);
    for (var i = 0; i < v.length; i++) {
      ret[i] = v[i];
    }
    return ret;
  }
  var args = Array.prototype.slice.call(arguments);
  args.unshift(1); // We add prefix an argument

  if (Array.isArray(v)) {
    ret = [];
    for (var i = 0; i < v.length; i++){
      args[0] = v[i];
      var value = EJSON.clone.apply(window, args);
      if (value !== EJSON.emptyFunction) {
        ret[i] = value;
      }
    }

    if (ret.length > 0) {
      return ret;
    } else {
      return EJSON.emptyFunction;
    }
  }
  // handle general user-defined typed Objects if they have a clone method
  if (typeof v.clone === 'function') {
    return v.clone();
  }
  // handle other objects
  ret = {};
  for (var key in v) {
    if (v.hasOwnProperty(key)) {
      args[0] = v[key];
      var value = EJSON.clone.apply(window, args);
      if (value !== EJSON.emptyFunction) {
        ret[key] = value;
      }
    }
  }

  if (Object.keys(ret).length > 0) {
    return ret;
  } else {
    return EJSON.emptyFunction;
  }
};

MeteorCordova = function(meteorUrl, options) {
  // Rig vars
  var self = this;
  // Send queue until client is ready
  self.eventQueue = {};

  self.activeEventListener = {};

  self.handshakeActivated = false;

  self.testFrame = (options && options.testFrame)?options.testFrame:false;

  // Rig Options
  self.version = (options && options.version)?options.version: '';
  self.appcache = !!(options && options.appcache && options.appcache === true);
  self.url = meteorUrl.replace(/\/+$/, "");
  self.onload = (options && options.onload)?options.onload: function() {};
  self.debug = !!(options && options.debug && options.debug === true);
  self.fallbackUrl = (options && options.fallbackUrl)?options.fallbackUrl: '';

  // Error handler
  self.onError = function() {
    // If the user have set a fallbackUrl we load that instead
    if (self.fallbackUrl) {
      self.loadUrl(self.fallbackUrl, true);
    }
  };

  self.runCallback = function(callback, onErrorMessage, args) {
    if (typeof callback !== 'function') {
      throw new Error('Error: Callback is not a function - ' + onErrorMessage);
    }
    // Make callback
    try {
      // we use appcache call amybody back
      callback.apply(window, args);
    } catch(err) {
      if (self.debug) {
        console.log(onErrorMessage);
      }
      // throw new Error('Failed to run callback: ' + onErrorMessage + ' Error: ' + err);
    }
  };

  self.init = function() {
    // Testing purpose
    if (self.testFrame !== false) {
      self.iframe = self.testFrame;
    } else {
      // Add the iframe element to DOM - We let the user to decide the css
      if (!self.iframe && document && document.body) {
        self.iframe = document.createElement('iframe');
        document.body.appendChild(self.iframe);
        // If on error is supported then we use it for catching an fallback
        self.iframe.onerror = self.onError;
      } else {
        throw new Error('Could not create and insert iframe element');
      }
    }
  };


  // Test if meteor is online
  self.load = function(callback) {
    self.init();

    var appCacheReady = localStorage.getItem('cachedVersion');
    var forceCheck = localStorage.getItem('forceCheck');
    // Check if its a callback
    callback = (typeof callback === 'function')?callback: function() {};
    // If an previous onload event allready has set the cachedVersion then we
    // rely on the appcache otherwice we do check for availabillity
    if (!appCacheReady || forceCheck) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4) {
          if (httpRequest.status === 200) {
            // We got an status 200 so we proceed
            self.runCallback(callback, 'ERROR: load callback on success');
            // Try to load meteor
            self.loadMeteor();
          } else {
            // Ups, we callback with an error
            callback(httpRequest.status);
          }
        }
      };
      httpRequest.open('GET', self.url);
      httpRequest.send();
    } else {
      // Call on error
      self.onError();
      // Call users callback
      self.runCallback(callback, 'ERROR: load callback on failure');
    }
  }; // EO load


  // We allow for loading any urls
  self.loadUrl = function(url, callbackUrlFlag) {
    self.iframe.onload = function(e) {
      self.runCallback(self.onload, 'ERROR: onload callback failed', [e, callbackUrlFlag]);
    };
    self.iframe.src = url;
  };


  // onload start listening to messages
  self.isLoaded = function(e) {
    // Ok, we made it... dont force a check on next load
    localStorage.setItem('forceCheck', false);

    // If we use appcache then set this
    if (self.appcache) {
      localStorage.setItem('cachedVersion', true);
    }

    self.sendHandshake();

    self.runCallback(self.onload, 'ERROR: onload callback failed', [e, false]);
  };


  // When online then add iframe to dom and load meteor
  self.loadMeteor = function() {
    // Set force check - if load failes then appcache might not be loaded?
    localStorage.setItem('forceCheck', true);
    self.iframe.onload = function(e) {
      self.isLoaded(e);
    };
    self.iframe.src = self.url;
  };

  // We registrer the onload event - otherwise we just fail, can we catch error?


  self.send = function(message) {
    if (self.iframe && self.iframe.contentWindow && self.handshakeActivated) {
      try {
        JSON.stringify(message);
      } catch(err) {
        message = { error: 'could not run json on message object' };
      }
      self.iframe.contentWindow.postMessage(message, self.url);
    }
  };

  self.sendHandshake = function() {
    if (self.debug) {
      console.log('------------ SEND HANDSHAKE!!! ------------');
    }
    // Send a handshake to the client to make sure we are all on the same page
    self.iframe.contentWindow.postMessage({ handshake: 'Meteor Rocks!'}, self.url);
  };

  self.triggerEvent = function(eventId, payload) {
    if (self.debug) {
      console.log('Event triggered: ' + eventId);
    }
    if (self.activeEventListener[eventId]) {
      self.send({
        eventId: eventId,
        payload: payload
      });
    } else {
      if (typeof self.eventQueue[eventId] === 'undefined') {
        self.eventQueue[eventId] = [];
      }
      self.eventQueue[eventId].push({
        eventId: eventId,
        payload: payload
      });
    }
  };

  self.sendCallback = function(invokeId, funcId, args) {
    if (self.debug) {
      console.log('----Send callback ' + invokeId + ' func: ' + funcId);
    }
    self.send({
      invokeId: invokeId,
      funcId: funcId,
      args: args
    });
  };

  self.addEventListener = function(eventId) {
    // Check if any events have been waiting for subscription
    if (typeof self.eventQueue[eventId] !== 'undefined') {
      for (var i = 0; i < self.eventQueue[eventId].length; i++) {
        self.send(self.eventQueue[eventId][i]);
      }
      // Clean up
      delete self.eventQueue[eventId];
    }

    // Set a flag so we dont have multiple event messages over the line
    self.activeEventListener[eventId] = true;
    // Well, some events are based on window - so we have to know this
    var windowEvents = { batterycritical: true, batterylow: true, batterystatus: true };
    // Get the event taget for this eventId
    var target = (windowEvents[eventId]) ? window : document;

    // Testing purpose
    if (self.testFrame) {
      target = self.testFrame;
    }

    // Add the event listener
    target.addEventListener(eventId, function(event) {
      // Got an event, let et be triggered
      // make a json proper object out off the event...
      var clonedEvent = EJSON.clone(event);
      self.triggerEvent(eventId, clonedEvent);
    }, false);
  };


  // TODO: test this function - maybe isolate the get function / value part into
  // a seperate function for test abillity
  self.connection = function(msg) {
    // We rig a connection for the iframe.
    if (msg) {
      //  EVENT - If meteor wants to listen for events
      if (typeof msg.eventId !== 'undefined') {
        if (self.debug) {
          console.log('------------ REGISTRER EVENT ' + msg.eventId + ' ------------');
        }

        self.addEventListener(msg.eventId);
      }

      if (typeof msg.handshake !== 'undefined' && msg.handshake === 'Meteor Rocks!') {
        if (self.debug) {
          console.log('------------ GOT HANDSHAKE!!! ------------');
        }
        self.handshakeActivated = true;
      }

      // CALL - if an function call then execute
      if (typeof msg.invokeId !== 'undefined' &&
              typeof msg.command !== 'undefined' &&
              typeof msg.args !== 'undefined') {

        if (self.debug) {
          console.log('------------ CALL METHOD ' + msg.command + ' ------------');
        }
        // Guess we got something like window.console.log
        var keys = msg.command.split('.');
        if (keys && keys.length > 0) {
          // Set reference to root element, window contains window - global
          var reference = window;

          // We save the last element for execution or fetch
          var last = keys[ keys.length - 1 ];
          // Iterate over command elements first ref: window[ keys[i] ]
          // We stop a level before hitting the last item: [0 .. n[
          for (var a = 0; a < keys.length - 1; a++) {
            // Check that the reference scope isnt undefined
            if (typeof reference !== 'undefined') {
              // set new reference a level deeper
              reference = reference[ keys[ a ] ];
            } else {
              // If reference is undefined then somethings wrong
              throw new Error('Can not call ' + msg.command);
            }
          }

          // We now have the second last element
          if (typeof reference !== 'undefined') {

            // Set the result to the last reference element
            var result = reference[last];

            // Check if result is a function
            if (typeof result === 'function') {
              // We got a reference to a function so we have to prepare
              // arguments in an array
              var myArgs = [];
              var counter = 0;
              // We iterate over msg.args array
              if (typeof msg.args !== 'undefined') {
                for (var i = 0; i < msg.args.length; i++) {
                  // Get the current argument
                  var arg = msg.args[i];
                  // If argument is a value then push the value to new arguments
                  if (typeof arg.value !== 'undefined') {
                    myArgs.push(arg.value);
                  }
                  // If argument is a function then push a callback with invokeId
                  // as reference
                  if (typeof arg.funcId !== 'undefined') {
                    // push new argument
                    myArgs.push(
                      // Bind values could use _.bind for this too
                      (function(invokeId, funcId) {
                        // Return the actual function for the argument
                        return function(/* arguments */) {
                          // Convert to an array to be consistent
                          var args = [];
                          for (var i = 0; i < arguments.length; i++) {
                            args.push(arguments[i]);
                          }

                          self.sendCallback(invokeId, funcId, args);
                        };
                      // Run with the values to bind
                      })(msg.invokeId, arg.funcId)
                    );
                  }
                }
              }

              // We call the referenced function, result was typeof function
              result = result.apply(reference, myArgs);
            } // EO is a function

            // We send the result of the var or function back to the resulting
            // Callback, this allways has funcId = 0
            self.sendCallback(msg.invokeId, 0, [result]);
          } // EO Got reference

        } else {
          throw new Error('ERROR: command is out of scope');
        }
      } // Execute a function or get a variable
    } // EO Got a message
  };

  self.messageEventHandler = function(event) {
    // If message is from meteor then
    if (event.origin === self.url) {
      // We have a connection
      self.connection(event && event.data);
    } else {
      throw new Error('Origins should match: ' + event.origin + ' === ' + self.url);
    }
  };

  // Start listening for messages
  window.addEventListener('message', self.messageEventHandler, false);

  return self;
};
