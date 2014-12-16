/*
Code by RaiX 2013

*/

// Rig reactive ready var
var _ready = new ReactiveVar(false);

Cordova = function(options) {
  var self = this;

  self.debug = (options && typeof options.debug !== 'undefined')?options.debug: false;

  self.plugins = {
    loaded: true
  };

  // Add plugins and set them deactivated until device is ready
  if (typeof options !== 'undefined' &&
          typeof options.plugins !== 'undefined') {

    for (var key in options.plugins) {
      if (options.plugins[key] === true) {
        self.plugins[key] = false;
      }
    }

  }

  self.url = 'file://';

  self.handshakeActivated = false;

  // If no handshake we put messages into FIFO queue
  self.messageQueue = [];

  // array of invokeId of callbacks 0 = the returning callback
  self.invokes = {};
  self.invokeCounter = 0;

  // array of eventId's containing an array of listeners
  self.eventCallbacks = {};

  // one time events
  self.oneTimeEvents = {
    'deviceready': true
  };



  self.isReady = function() {
    return _ready.get();
  };

  self.addEventListener = function(eventId, callback) {
    if (typeof callback !== 'function') {
      throw new Error('ERROR: Cordova.addEventListener expects callback as function');
    }
    if (typeof self.eventCallbacks[eventId] === 'undefined') {

      // Initialize
      self.eventCallbacks[eventId] = [];

      // Let the cordova know we are interested in this event
      self.send({
        eventId: eventId
      });
    }
    // Return the callback id
    return self.eventCallbacks[eventId].push(callback);
  };

  self.addInvokingCallback = function(invokeId, callback) {
    if (typeof self.invokes[invokeId] === 'undefined') {
      self.invokes[invokeId] = [];
    }
    return self.invokes[invokeId].push(callback) - 1;
  };

  // command 'window.test' args [a, v], callback returns resulting value
  // args and callback are both optional if no callback and args a function then
  // no args are assumed and callback isset
  self.call = function(command, args, callback) {
    // Support that the user skips the arguments and only sets a callback
    if (!callback && typeof args === 'function') {
      callback = args;
      args = [];
    }

    callback = (callback) ? callback : function() {};

    if (typeof callback !== 'function') {
      throw new Error('MeteorCordova expects callback as a function');
    }

    var invokeId = self.invokeCounter++;
    var myArgs = [];


    // args should allways be an array
    args = (args && args.length)? args : [];

    // We set the returning callback id == 0
    self.addInvokingCallback(invokeId, callback);

    // We parse the arguments and filter out callback functions
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      // If the argument is a function
      if (typeof arg === 'function') {
        var funcId = self.addInvokingCallback(invokeId, arg);
        myArgs.push({ funcId: funcId });
      } else {
        myArgs.push({ value: arg });
      }
    } // EO arg preparing
    // Send message
    self.send({
      invokeId: invokeId,
      command: command,
      args: myArgs
    });
  };

  self.send = function(message) {
    // Check if we are in iframe
    if (typeof window !== 'undefined' && window.parent &&
            self.handshakeActivated) {
     try {
        JSON.stringify(message);
      } catch(err) {
        throw new Error('Cant send type of message, Error: ' + err);
        message = { error: 'could not run json on event object' };
      }
      // Send the message directly
      window.parent.postMessage(message, self.url);
    } else {
      // Add message to queue until device and meteor both are ready
      self.messageQueue.push(message);
    }
  };

  self.connection = function(msg) {
    if (typeof msg.handshake !== 'undefined') {
      // We got a handshake from the cordova
      self.handshakeActivated = true;
      // Respond to parent do shake back
      self.send({ handshake: msg.handshake });
      // Resume queue FIFO
      if (typeof self.messageQueue !== 'undefined') {
        for (var i = 0; i < self.messageQueue.length; i++) {
          self.send(self.messageQueue[i]);
        }
      }
      // Empty queue array
      self.messageQueue = [];
    }

    // We got an event to dispatch
    if (typeof msg.eventId !== 'undefined') {
      var listeners = self.eventCallbacks[msg.eventId];
      if (typeof listeners !== 'undefined') {
        // Trigger all listeners for this event
        for (var i = 0; i < listeners.length; i++) {
          try {
            listeners[i].apply(window, [msg.payload]);
          } catch(err) {
          }
        }
        // If this is a one time event like deviceready remove all listeners
        if (self.oneTimeEvents[msg.eventId]) {
          delete self.eventCallbacks[msg.eventId];
        }
      }
    } // EO msg event

    // We got a callback function invoked
    if (typeof msg.invokeId !== 'undefined' &&
            typeof msg.funcId !== 'undefined' &&
            typeof msg.args !== 'undefined') {

      // Get the invoke object
      var invoked = self.invokes[msg.invokeId];
      if (typeof invoked === 'undefined') {
        return;
      }

      // Get the invoked function
      var invokedFunction = invoked[msg.funcId];
      if (typeof invokedFunction === 'undefined') {
        return;
      }

      var functionToRemove = 0;
      var removeInvoked = false;
      // scope eg. this.remove() and this.removeAll() these will
      // remove the current callback or all callbacks of this call
      var removeScope = {
        remove: function() {
          functionToRemove = msg.funcId;
        },
        removeAll: function() {
          removeInvoked = true;
        }
      };

      if (typeof invokedFunction !== 'function') {
        throw new Error('ERROR: Execute client callback '+msg.invokeId+' funcId: '+msg.funcId + ' not a function');
        return;
      }

      // Make sure that we have an array to pass on in the apply
      var args = [];
      for (var key in msg.args) {
        args.push(msg.args[key]);
      }

      // All set, we callback the function
      try {
        invokedFunction.apply(removeScope, args);
      } catch(err) {
        throw new Error('ERROR: Execute client callback '+msg.invokeId+' funcId: '+msg.funcId + ' Error: ' + err);
      }

      // If the returning callback then delete this?
      // Garbage collection?
      if (msg.funcId === functionToRemove || removeInvoked) {

        if (Object.keys(invoked).length === 1 || removeInvoked) {
          // The invoked method call only contains returning callback, we
          // Remove the invoke itself since there will be no more calls
          delete self.invokes[msg.invokeId];
        } else {
          // Even if we delete an item the index is preserved so the callback
          // funcId still points to the right function
          delete self.invokes[msg.invokeId][msg.funcId];
        }
      }
    } // EO method

    if (msg.error) {
      throw new Error('Client got error back ' + msg.error);
    }
  }; // EO Connection

  self.messageEventHandler = function(event) {
    // If message is from meteor then
    if (event.origin === self.url) {
      // We have a connection
      self.connection(event && event.data);
    }
  };

  // Start listening for messages
  if (typeof window.addEventListener !== 'undefined') {
    window.addEventListener('message', self.messageEventHandler, false);
  }

  // Listen for deviceready event
  self.addEventListener('deviceready', function() {
    // Set the ready flag
    _ready.set(true);
    // Activate all native plugin API's
    for (var key in self.plugins) {
      if (self.plugins.hasOwnProperty(key)) {
        self.plugins[key] = true;
      }
    }
  });

  return self;
};
