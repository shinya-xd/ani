import request from 'request';

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:59.0) Gecko/20100101 Firefox/59.0";
const cookieJar = new request.jar();
const cloudScraper = require('cloudscraper');

function isStatusCodeSuccess(statusCode) {
  statusCode = statusCode.toString();
  return statusCode.length === 3 && (statusCode.startsWith('1') || statusCode.startsWith('2') || statusCode.startsWith('3'));
}

function preProcessUrl(url, tries) {
  url = encodeURI(url).replace(/%25/g, '%');

  if (Meteor.isDevelopment) {
    console.log('Downloading: url \'' + url + '\', try \'' + tries + '\'');
  }

  // TODO: Fix http downloads on the client
  if (Meteor.isClient && url.startsWith('http://')) {
    return false;
  }

  return url;
}

function callBackWithErrorHandling(callback, ...arguments) {
  try {
    callback(...arguments);
  } catch (e) {
    console.error(e);
  }
}

startDownloadWithCallback = async function(url, callback) {
  _.delay(Meteor.bindEnvironment(downloadWithCallback), Math.random() * 200, url, callback);
};

function downloadWithCallback(url, callback, tries=1) {
  // TODO: Fix database stuff so the client can download too
  // if (Meteor.isServer || Session.get('AddOnInstalled')) {

  if (Meteor.isServer) {
    url = preProcessUrl(url, tries);
    if (!url) {
      callBackWithErrorHandling(callback, false);
      return;
    }

    let options = {
      method: 'GET',
      encoding: null,
      jar: cookieJar,
      headers: {
        'User-Agent': userAgent
      },
      url: url,
    };

    cloudScraper.request(options, Meteor.bindEnvironment((error, response, body) => {
      if (error) {
        switch (error.errorType) {
          case 0:
            error = error.error;
            break;
          case 1:
            error = 'CloudFlare returned a captcha page';
            break;
          case 2:
            error = 'CloudFlare error: ' + error.error;
            break;
          case 3:
            error = error.error;
            break;
        }
      } else if (!isStatusCodeSuccess(response.statusCode)) {
        error = response.statusCode + ' ' + response.statusMessage;
      }

      if (error) {
        tryNextDownloadWithCallback(url, callback, tries, error);
      }

      else {
        callBackWithErrorHandling(callback, body.toString());
      }
    }));
  }
}

function tryNextDownloadWithCallback(url, callback, tries, err) {
  if (tries >= 4) {
    console.error('Failed downloading ' + url + ' after ' + tries + ' tries.');
    console.error(err);
    callBackWithErrorHandling(callback, false);
  } else {
    _.delay(Meteor.bindEnvironment(downloadWithCallback), 200 + Math.random() * 800, url, callback, tries + 1);
  }
}

startDownloadToStream = async function(url, callback) {
  _.delay(Meteor.bindEnvironment(downloadToStream), Math.random() * 200, url, callback);
};

function downloadToStream(url, callback, tries=1) {
  // TODO: Fix database stuff so the client can download too
  // if (Meteor.isServer || Session.get('AddOnInstalled')) {

  if (Meteor.isServer) {
    url = preProcessUrl(url, tries);
    if (!url) {
      callBackWithErrorHandling(callback, false, false, false);
      return;
    }

    let options = {
      method: 'GET',
      encoding: null,
      jar: cookieJar,
      headers: {
        'User-Agent': userAgent
      },
      url: url,
    };

    request.get(options).on('response', Meteor.bindEnvironment((response) => {
      if (isStatusCodeSuccess(response.statusCode)) {
        callBackWithErrorHandling(callback, response, response.headers['content-type'].split('; ')[0], Number(response.headers['content-length']));
      }

      else {
        tryNextDownloadToStream(url, callback, tries, response.statusCode + ' ' + response.statusMessage);
      }
    }))

    .on('error', Meteor.bindEnvironment((err) => {
      tryNextDownloadToStream(url, callback, tries, err);
    }));
  }
}

function tryNextDownloadToStream(url, callback, tries, err) {
  if (tries >= 4) {
    console.error('Failed downloading ' + url + ' after ' + tries + ' tries.');
    console.error(err);
    callBackWithErrorHandling(callback, false, false, false);
  } else {
    _.delay(Meteor.bindEnvironment(downloadToStream), 200 + Math.random() * 800, url, callback, tries + 1);
  }
}
