Package.describe({
  git: 'https://github.com/SpaceCapsule/Meteor-cordova.git',
  name: 'raix:cordova',
  version: '0.2.3',
  summary: 'Adds basic support for Cordova/Phonegap'
});


Cordova.depends({
  'org.apache.cordova.dialogs': '0.2.10',
  'org.apache.cordova.vibration': '0.3.11'
});

Package.onUse(function (api) {
  api.versionsFrom('1.0');

  api.use('reactive-var', 'client');
  // The Meteor build solution
  api.addFiles('cordova.client.js', 'web.cordova');
  api.addFiles('cordova.client.notification.js', 'web.cordova');

  // The iFrame solution
  api.use('ejson', 'web.browser');
  api.addFiles('web.client.js', 'web.browser');
  api.addFiles('web.client.notification.js', 'web.browser');

  api.export('Cordova', 'client');
});

Package.onTest(function(api) {
    api.use('raix:cordova', ['client']);
    api.use('test-helpers', 'client');
    api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
             'random', 'tracker']);

  api.addFiles([
    'plugin/meteor.cordova.js',
    'meteor.cordova.tests.js',
  ], 'client');
});
