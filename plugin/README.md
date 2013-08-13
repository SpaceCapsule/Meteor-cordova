Manual Installation Instructions
---------------

If you want to just put these files into place.

    cd pathToThisRepo/plugin
    cp meteor.cordova.js pathToYourWWW/js/
    cp meteor.cordova.css pathToYourWWW/css/
    cp fallbackurl.example.html pathToYourWWW/
    cp index.example.html pathToYourWWW/

Then you should backup your own index.html file (just to be safe):

    cd pathToYourWWW
    cp index.html index.orig.html

You can copy our example over your index.html or just edit to match.

Details / Gotchas
----------------

Ensure the `cordova-X-X.js` JS file is the correct one for whatever version of
PhoneGap / Cordova you are running.

Ensure the path to all JS and CSS assets are correct (verify the files are
there and that the case is correct).

Ensure that any PhoneGap plugins you have added, which have a JS file, are also put in place.

Your own "in app" JS
---------------

Do you have your own JS you want to run "on device"?

You can certainly run all of this via Meteor, via "push", but you may want to
have your own JS running "on device" before Meteor is loaded, or in fact,
a test page you could run without Meteor at all.

This is no problem.  Just include your own JS file(s) in the `index.html` page
and you can trigger anything you like within the `'devicerady'` event/callback.
