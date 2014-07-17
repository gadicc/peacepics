Package.describe({
    summary: "Facebook, full integration, w/ collections & realtime reactivity"
});

Package.on_use(function (api) {
	Npm.depends({
		'body-parser': '1.4.3',
//		'connect': '3.0.2',
		'fbgraph':'0.2.10'
	});
	
	api.use('underscore', 'server');
	api.use(['http', 'service-configuration', 'webapp'], 'server');

	api.use('inject-initial', ['client', 'server']);
	api.use('npm', 'server');

	api.add_files('lib/server.js', 'server');
	api.add_files('lib/client.js', 'client');

	api.export('facebook', ['client', 'server']);
});
