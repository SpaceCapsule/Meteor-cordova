Cordova.prototype.alert = function(message, alertCallback, title, buttonName) {
  if (typeof alertCallback !== 'function')
    throw new Error('Function "alert" expects a callback function');

  navigator.notification.alert(message, alertCallback, title, buttonName);
};

Cordova.prototype.confirm = function(message, confirmCallback, title, buttonLabels) {
  if (typeof confirmCallback !== 'function')
    throw new Error('Function "confirm" expects a callback function');

  navigator.notification.confirm(message, confirmCallback, title, buttonLabels);
};

Cordova.prototype.prompt = function(message, promptCallback, title, buttonLabels, defaultText) {
  if (typeof promptCallback !== 'function')
    throw new Error('Function "prompt" expects a callback function');

  navigator.notification.prompt(message, promptCallback, title, buttonLabels, defaultText || '');
};

Cordova.prototype.beep = function(times) {
  times = times || 1;
  navigator.notification.beep(times);
};

Cordova.prototype.vibrate = function(milliseconds) {
  navigator.notification.vibrate(milliseconds);
};

Cordova.prototype.close = function() {
  navigator.app.exitApp();
};
