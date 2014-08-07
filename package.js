Package.describe({
    summary: "Adds basic support for Cordova/Phonegap\n"+
         "\u001b[32mv0.0.8\n"+
  		   "\u001b[33m-----------------------------------------\n"+
  		   "\u001b[0m Adds basic support for Cordova/Phonegap  \n"+
  		   "\u001b[0m shell communication in iframe            \n"+
  		   "\u001b[33m-------------------------------------RaiX\n"
});

Package.on_use(function (api) {
  api.use('deps','client');
  api.use('ejson', 'client');

  api.add_files('cordova.client.js', 'client');
  api.add_files('cordova.client.notification.js', 'client');

  api.export && api.export('Cordova', 'client');

});

Package.on_test(function(api) {
  api.use('cordova', ['client']);
  api.use('test-helpers', 'client');
  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files([
    'plugin/meteor.cordova.js',
    'meteor.cordova.tests.js',
  ], 'client');
});
