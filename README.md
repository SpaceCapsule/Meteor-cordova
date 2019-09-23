Cordova [![Build Status](https://travis-ci.org/raix/Meteor-cordova.png?branch=master)](https://travis-ci.org/raix/Meteor-cordova)
=======

__!! This package is deprecated - please use the builtin cordova support in Meteor !!__

Simple common api for coding with Cordova / Phonegap. The functions fallback if Cordova is not loaded, degrading to browser functionality.

This package consists of multiple features:
* Running Meteor in Cordova on a device
* Allow appcache to work
* ~~Fallback url if meteor cant load - when using appcache this would be the case until appcache is initialized~~ *(working on a fallback model on the runtime branch)*
* Allowing Meteor to interact with Cordova and plugins

#Getting started
1. Use the cordova CLI to install the plugin in the project
```bash
$ cordova plugin add https://github.com/raix/Meteor-cordova.git
```
2. Use meteorite to add the package to the meteor app
```bash
mrt add cordova
```

Add some boilerplate checkout `www/index.example.html` inspiration. When the device is ready MeteorCordova can be used, the plugin is loaded by Cordova so no need for script tags.
```html
<body>
  <iframe id="meteor" src="http://www.meteor.com"></iframe>

  <script type="text/javascript">
  
    shellVersion = '0.1.4';

    meteor = new MeteorCordova('meteor');

    // meteor.initPush({ senderID: 'xGoogleKeyx' });

  </script>


</body>
```
*Have a look at the plugin/index.html file for more a basic boilerplate*

#The Meteor client API
##Init
```js
  cordova = new Cordova();
```
adding options:
```js
  cordova = new Cordova({
    plugins: {
      notification: true // More docs below in the native section
    }
  });
```

##Call device scope javascript
To call functions or read variables on the device we have a simple function `call`
Call takes three parametres:
`command`, [`arguments`], `returningCallback`
*The returning callback is optional*

Examples:
Read a variable
```js
  cordova.call('foo', [], function(value) {
    console.log('We got value = ' + value);
  });
```
Call a function with no returning callback
```js
  cordova.call('console.log', ['Hello world']);
```

Call with callbacks in the parametres
```js
  function onSuccess(heading) {
      alert('Heading: ' + heading.magneticHeading);
  };

  function onError(error) {
      alert('CompassError: ' + error.code);
  };

  cordova.addEventListener('deviceready', function() {
    cordova.call('navigator.compass.getCurrentHeading', [onSuccess, onError]);
  });
```

Call with callbacks in parametres and a returning callback
```js
  function onSuccess(heading) {
      var element = document.getElementById('heading');
      element.innerHTML = 'Heading: ' + heading.magneticHeading;
  };

  function onError(compassError) {
      alert('Compass error: ' + compassError.code);
  };

  var options = {
      frequency: 3000
  }; // Update every 3 seconds

  cordova.call('navigator.compass.watchHeading', [onSuccess, onError, options], function(watchID) {
    console.log('We've got a watch id: ' + watchID);
  });
```

##Add event listeners
To add an event listener it follows the cordova api closely
```js
cordova.addEventListener('deviceready', function() {
  // Got a ready device
});
```

##Device ready
`cordova.isReady` is reactive and holds the state of the device

```js
  Template.hello.deviceready = function() {
    return cordova.isReady();
  };
```
*Adding a template helper*

#Notification API
This api works in browsers and on devices - It's also ment as an example howto extend the Meteor `Cordova` api for supporting more plugins.

##Native support:
For native support install the package
```bash
$ cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-vibration.git
$ cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-dialogs.git
```
Tell meteor's cordova to use native notifications when device is ready.

Activate the native notification:
```js
cordova = new Cordova({
  plugins: {
    notification: true, // If we have both native plugins installed
    // vibration: true, // only the vibration plugin
    // dialogs: true, // only the dialogs plugin
  }
});
```

##Cordova.alert
cordova.alert(message, alertCallback, [title], [buttonName])
```js
    cordova.alert("Hello", function() {
        // Alert is closed
    }, 'Greeting', 'Ok')
```

##Cordova.confirm
`cordova.confirm(message, confirmCallback, title, buttonLabels)``

##Cordova.prompt
`cordova.prompt(message, promptCallback, title, buttonLabels, defaultText)``

##Cordova.beep
`cordova.beep(times)`

##Cordova.vibrate
In a browser without cordova support it defaults to low vibrating sound in speakers.
`cordova.vibrate(milliseconds)`

*For more detailed info on the api I'll point to [phonegap.com](http://www.phonegap.com) for now*
