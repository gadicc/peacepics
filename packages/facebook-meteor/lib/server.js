var fbgraph = Npm.require('fbgraph');
var Fiber = Npm.require('fibers');

graph = Async.wrap(fbgraph, [
	'extendAccessToken',
	'get',
	'search',
	'setAccessToken'
]);

facebook = {
	appCredentials: null,
	appToken: null,

	collections: {
		meta: new Meteor.Collection('facebook_meta'),
		feeds: new Meteor.Collection('facebook_feeds'),
		pages: new Meteor.Collection('facebook_pages'),
	},

	feed: {},
	page: {},

	hooks: {
		feed: []
	}
}

/*
 * Retrieve the app's oauth token (from fb or database, if cached)
 *
 */
function setAppToken(conf) {
	var conf2 = facebook.collections.meta.findOne('appToken');
	if (!conf2 || conf.appId != conf2.appId || conf.secret != conf2.secret) {
		facebook.appToken = HTTP.get(
			'https://graph.facebook.com/oauth/access_token?client_id='
			+ conf.appId + '&client_secret=' + conf.secret + '&grant_type=client_credentials'
		).content.split('=')[1];
		facebook.collections.meta.upsert('appToken', _.extend({
			appToken: facebook.appToken, appId: conf.appId, secret: conf.secret
		}));
	} else {
		facebook.appToken = conf2.appToken;
	}	
	fbgraph.setAccessToken(facebook.appToken);
}

facebook.appCredentials = ServiceConfiguration.configurations.findOne({service: 'facebook'});
if (facebook.appCredentials) {
	setAppToken(facebook.appCredentials);
} else {
	var handle = ServiceConfiguration.configurations.find({service:'facebook'}).observe({
	  'added': function(doc) {
	  	facebook.appCredentials = doc;
	  	setAppToken(doc.appToken);
	  	handle.stop();
	  }
	});
}

facebook.on = function(hook, func) {
	if (!facebook.hooks[hook])
		throw new Error('No such facebook hook, "' + hook + '"');
	facebook.hooks[hook].push(func);
}

facebook.feed._get = function(user, url) {
	var res = url ? graph.get(user) : graph.get(user + '?fields=feed').feed;
	var inserted = false;
	if (res.data)
	_.each(res.data, function(post) {
		post._id = post.id;
		inserted = !!facebook.collections.feeds.upsert(post.id, post, { upsert: true }).insertedId;
		if (inserted)
			for (var i=0; i < facebook.hooks.feed.length; i++)
				facebook.hooks.feed[i].call(null, post);
	});
	if (inserted && res.paging && res.paging.next) {
		console.log('new page');
		facebook.feed._get(res.paging.next, true);
	}
}
facebook.feed.get = function(user) {
	Fiber(function() {
		facebook.feed._get(user);
	}).run();
}

facebook.page._get = function(page, fields, force) {
	var response;
	if (!force) {
		response = facebook.collections.pages.findOne(page, fields ? {
			fields: _.map(fields.split(','), function(f) { var o={}; o[f] = 1; return f; })
		} : {});
		if (response)
			return response;
	}

	response = graph.get(page + (fields ? 'fields=' + fields : ''));
	facebook.collections.pages.upsert(response.id, { $set: response });
	return response;
}

facebook.page.get = function(page, fields, force) {
	Fiber(function() {
		facebook.page._get(page, fields, force);
	}).run();	
}

//var connect = Npm.require("connect");
var bodyParser = Npm.require('body-parser');
WebApp.connectHandlers
	.use(bodyParser.json())
	.use(function(req, res, next) {
		var url = '/callbacks/facebook';
		if (req.url.substr(0, url.length) !== url)
			return next();


		console.log(req.url);
		console.log(req.body);

/*
		if (!req.body.fax) {
			console.log('/callbacks/phaxio: Malformed request ignored.');
			return;
		}

		Fiber(function() {
			noticeFaxes.update({faxId: fax.id}, {$set: toset});
		}).run();
*/


		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end('<html><body>OK</body></html>', 'utf8');
});

console.log(Meteor.absoluteUrl());