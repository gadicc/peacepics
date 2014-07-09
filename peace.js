if (Meteor.isClient) {

  mink.init(FILEPICKER_API_KEY, {
    'profiles': {
      default: {
        minkOptions: {
          urlType: 's3'
        }
      }
    }
  });

  Accounts.ui.config({
    requestPermissions: {
      // https://developers.facebook.com/docs/facebook-login/permissions/
      facebook: ['user_location'],
      // https://developers.google.com/oauthplayground/
      // http://discovery-check.appspot.com/
      google: ['profile']
      /*
       * http://developer.github.com/v3/oauth/#scopes
       * unnecessary write permission.  profile is public by default
       * github: ['user']
       */
    }
  });

  var navbarActive = function(path) {
    $('.navbar-nav li.active').removeClass('active');
    $('.navbar-nav a[href="'+path+'"]').parent().addClass('active');
  }

  Router.configure({
    layoutTemplate: 'layout',
    onAfterAction: function() {
      navbarActive(this.path);
    },
    onStop: function() {
      if (this.handles)
      for (key in this.handles) {
        console.log('stop ' + key);
        this.handles[key].stop();
      }
    }
  });

  Router.hooks.loginFirst = function(pause) {
    if (!Meteor.userId()) {
      this.render('loginFirst');
      pause();
    }
  }

}

if (Meteor.isServer) {

  AccountsExtra.init({
    saveCreatedAt: true,
    saveProfilePic: true,
    saveServiceUsername: true,
    saveLocation: true
  });

  // redirect to ROOT_URL host if not already using it
  // currently required for oauth from multiple hosts.
  // also force ssl, easier than modding force-ssl package
  // for production only (interferes with callbacks via dyndns)
  if (process.env.NODE_ENV == 'production')
  WebApp.connectHandlers.use(function (req, res, next) {
    if (Inject.appUrl(req.url)) {
      var rootHost = /https?:\/\/(.*?)\/.*/.exec(process.env.ROOT_URL)[1];
      var thisHost = req.headers.host.replace(/:\d+$/, '');
      if (rootHost != req.headers.host
          || req.headers['x-forwarded-proto'] != 'https') {
        res.writeHead(302, {
          'Location': 'https://' + rootHost + req.url
        });
        res.end();
        return;     
      }
    }
    return next();
  });

}
