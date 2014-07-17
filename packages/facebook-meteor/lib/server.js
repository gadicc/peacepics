var fbgraph = Npm.require('fbgraph');
var Fiber = Npm.require('fibers');

graph = Async.wrap(fbgraph, [
	'extendAccessToken',
	'get',
	'post',
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
	Inject.obj('facebook-meteor', {
		appId: conf.appId
	});
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
		Meteor.setTimeout(function() {
			console.log('new page');
			facebook.feed._get(res.paging.next, true);
		}, 1000);
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

// http://stackoverflow.com/questions/17197970/facebook-permanent-page-access-token
// http://stackoverflow.com/questions/12168452/long-lasting-fb-access-token-for-server-to-pull-fb-page-info/21927690#21927690

facebook.page.reqAuth = function(pageId) {
	var url = 'https://graph.facebook.com/oauth/access_token?'
		+ 'client_id=' + facebook.appCredentials.appId
		+ '&client_secret=' + facebook.appCredentials.secret
		+ '&redirect_uri=' + 'http://localhost:5000/'
		+ '&response_type=token&scope=manage_pages&code='
		+ 'CAAFvTvnWMmIBAJomiDBQedBbIRKhjc2E6anwFtTnjaqixW68VmdHcZCqr15FMfurnilVlmKWKLOs4gPeprZA83UCawh2L8y5eQspcs91kepXWCe2TZASuF1c1n537lGB78KuT83N8t1ONobdANS4Jl9NNNAfZAaYK4JDfASD4oZA26azkqFwj8llZBCAh6pHcZD'
		console.log(url);
	var response = HTTP.get(url);
	console.log(response);
}

facebook.page.getToken = function(pageId) {
	var response = graph.post(pageId+'/?fields=access_token', {
		access_token: 'CAAFvTvnWMmIBAJomiDBQedBbIRKhjc2E6anwFtTnjaqixW68VmdHcZCqr15FMfurnilVlmKWKLOs4gPeprZA83UCawh2L8y5eQspcs91kepXWCe2TZASuF1c1n537lGB78KuT83N8t1ONobdANS4Jl9NNNAfZAaYK4JDfASD4oZA26azkqFwj8llZBCAh6pHcZD'
	});
}

facebook.page.installApp = function(pageId) {
	var response = graph.post(pageId+'/tabs/', {
		appId: facebook.appCredentials.appId,
		access_token: 'CAAFvTvnWMmIBAAi1jHp1d3ZAjDGSKiGxfdvOC1oXUkLJ5ZCJ8s2T26r8ll9pdVZB4weKvzGa7CyasFXUwhRUpGL3meeffwiJQYqTwd9UcfRswwZCo1l4uwrYeI06k2Q4AxTWEw6EXCRDV4ZCNGaiZC5ZBMMqJkFIac9IdPNDGJldZAKdZAZAxdZCCniyjd83CGZAK4KYgnCvARHQa3qjOMWqZBs19Fc8oeSFLYgsZD'
	});
	console.log(response);
}

Meteor.setTimeout(function() {
	//facebook.page.reqAuth("417366255018379");
	//facebook.page.installApp("417366255018379");

}, 1000);


/*
facebook.page.installApp = function(pageId) {
	var url = 'https://graph.facebook.com/' + pageId +
		'/tabs' + '?access_token=' + 'CAAFvTvnWMmIBAJomiDBQedBbIRKhjc2E6anwFtTnjaqixW68VmdHcZCqr15FMfurnilVlmKWKLOs4gPeprZA83UCawh2L8y5eQspcs91kepXWCe2TZASuF1c1n537lGB78KuT83N8t1ONobdANS4Jl9NNNAfZAaYK4JDfASD4oZA26azkqFwj8llZBCAh6pHcZD';
	console.log(url);
	var response = HTTP.post(url, { data: {
		appId: facebook.appCredentials.appId
	}});
}
*/


facebook.subscribe = function(id, subs) {
	var appId = facebook.appCredentials.appId;
	var verify_token = Random.id();
	var response = HTTP.post('https://graph.facebook.com/' + appId +
		'/subscroptions', { data: {
			object: 'page',
			callback_url: 'http://gc-dragon.dyndns.org:5000/callbacks/facebook',
			verify_token: verify_token
		}});
}
//subscribe('')

//var connect = Npm.require("connect");
var bodyParser = Npm.require('body-parser');
WebApp.connectHandlers
	.use(bodyParser.json())
	.use(function(req, res, next) {
		var url = '/callbacks/facebook';
		if (req.url.substr(0, url.length) !== url)
			return next();

		console.log(req.url);
		console.log(req.method);
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


		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('OK');
});

console.log(Meteor.absoluteUrl());