Pics = new Meteor.Collection('pics');
var fbPages = {
	"AniBoherBaShalom": "663130193756030",
	"ArabsAndJews": "417366255018379"
};
var fbPageIds = {
	"663130193756030": "AniBoherBaShalom",
	"417366255018379": "ArabsAndJews"
}
var PICS_INIT_ROWS = 4;
PICS_INIT_ROWS = 50;  // TODO infinite scroll

if (Meteor.isClient) {

	Router.map(function() {
		this.route('home', {
			path: '/',
			onBeforeAction: function() {
				Router.go('/AniBoherBaShalom');
			}
		});

		this.route('*', {
			path: '/:pageName',
			template: 'fbPage',
			onBeforeAction: function(pause) {
				if (!fbPages[this.params.pageName])
					return false;
				Session.set('fbPageName', this.params.pageName);
				Session.set('fbPageId', fbPages[this.params.pageName]);
			}
		});
	});

	Template.fbPage.events({
		'click #add': function(event, tpl) {
			Session.set('picsLimit', Session.get('picsLimit') + 1);
			Pics.insert({
				createdAt: new Date()
			});
			/*
			Deps.afterFlush(function() {
				Meteor.setTimeout(function() {
					var x = $('.masonry_container');
					x.masonry();
					x.masonry('reloadItems');
					x.masonry('layout');
				}, 500);
			});
			*/
		}
	});

	Template.pic.events({
		'click div.pic': function(event, tpl) {
			console.log(tpl);
			modal({
				title: false, //'What do you think?',
				showFooter: false,
				body: 'picPopup',
				context: tpl.data
			});
		}
	});

	Template.pic.rendered = function() {
		// after loading thumbnail, load full res version
		this.$('img')[0].onload = function() {
			this.src = this.src.replace(/album$/, 'normal');
		}
	}

	Template.picPopup.rendered = function() {
		if (typeof FB === 'object')
			FB.XFBML.parse();
	};

	Template.picPopup.events({
		'click #hidePic': function(event, tpl) {
			console.log(tpl.data._id);
			facebook.collections.feeds.update(tpl.data._id, { $set: {
				hidden: true
			}});
			console.log(tpl.data);
			console.log(facebook.collections.feeds.findOne(tpl.data._id));
		}
	});

	Stats = new Meteor.Collection('stats');
	Meteor.subscribe('stats');

	// http://www.mredkj.com/javascript/numberFormat.html#addcommas
	function addCommas(nStr) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}

	Template.fbPage.helpers({
		'page': function(name) {
			var current = Session.get('fbPageName');
			return name ? current == name : current;
		},
		'pics': function() {
			if (!subs.pics.ready())
				return [];
			return Pics.find({ pageId: Session.get('fbPageId') }, {
				limit: Session.get('picsLimit'),
				sort: { createdAt: -1 }
			});
		},
		'tagline': function() {
			var doc = facebook.collections.pages.findOne(Session.get('fbPageId'));
			var count = doc ? addCommas(doc.likes) : 0;
			var page = Session.get('fbPageName');

			switch(page) {
				case 'AniBoherBaShalom':
					return mf('tagline_AniBoherBaShalom', { count: count },
						'{count} people chose peace.');
				case 'ArabsAndJews':
					return mf('tagline_ArabsAndJews', { count: count },
						'{count} refuse to be enemies');
			}
		},
		'fbLink': function() {
			var page = facebook.collections.pages.findOne(Session.get('fbPageId'));
			if (!page) return '';

			return '<a href="'+page.link+'" target="_TOP">'
				+ mf('fblink',
				{ pageLink: '<span>' + page.name + '</span>'},
				'Visit "{pageLink}" on Facebook.  Like us.  Share us.' );
		},
		'count': function() {
			//var doc = Stats.findOne('pics');
			var doc = facebook.collections.pages.findOne(Session.get('fbPageId'));
			return doc ? addCommas(doc.likes) : 0;
		},
		bg: function() {
			return 'background: rgb('
				+ Math.round(Math.random() * 255) + ','
				+ Math.round(Math.random() * 255) + ','
				+ Math.round(Math.random() * 255) + ');'
		}
	});

	var lastInsert = null;
	Template.fbPage.rendered = function() {
		var parent = this.$('#gallery')[0];
		parent._uihooks = {
			insertElement: function(node, next) {
				console.log(subs.pics.ready());
				var $node = $(node);
				var now = new Date();
				var animate = now - lastInsert > 500;
				lastInsert = now;

				if (animate)
					$node.addClass('zeroWidth');

				parent.insertBefore(node, next);

				if (animate)
				window.setTimeout(function() {
					$node.removeClass('zeroWidth');
				}, 0);
			}
		}
	}

	subs = {};
	Deps.autorun(function() {
		subs.pics = Meteor.subscribe('pics', Session.get('picsLimit'));
	});

	Session.set('windowWidth', $(window).width());
	$(document).ready(function() {
		Deps.autorun(function() {
			var IDEAL_WIDTH = 200;
			var sheet = document.getElementById('picStyle').sheet;
			var windowWidth = Session.get('windowWidth');
			var cols = Math.round(windowWidth / IDEAL_WIDTH);
			var width = (windowWidth / cols) - 0.1;
			var height = width * 0.75;

			if (!Session.get('picsLimit'))
				Session.set('picsLimit', cols * PICS_INIT_ROWS);

			if (sheet.rules && sheet.rules.length)
					sheet.deleteRule(0);
			sheet.insertRule('div.pic { width: ' + width + 'px; height: ' + height + 'px;', 0);
		});
	});
	window.onresize = function() {
		Session.set('windowWidth', $(window).width());
	}
	Meteor.setInterval(function() {
		// detect if scrollbar added
		var width = $(window).width();
		if (Session.get('modalData'))
			return;
		if (Session.get('windowWidth') !== width)
			Session.set('windowWidth', width);
	}, 100);

	Meteor.subscribe('pages');

  function timeAgoShort(time) {
    // difference in seconds
    var date = new Date(), now = new Date();
    date = new Date(time);
    // date.setUTCDate(time);

    var diff = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) // minute
    	return '< 1m';
    if (diff < 3600) // hour
    	return Math.round(diff / 60) + 'm';
    if (diff < 82800) // 23 hrs  
      return Math.round(diff/3600) + 'h';
    if (diff < 2635200) // 30.5 days
      return Math.round(diff/86400) + 'd';
    if (diff < 28987200) // 11 months
    	return Math.round(diff/2635200) + 'mo';
    return Math.round(diff/31536000) + 'y';
  }

  UI.registerHelper('timeAgoShort', function(time) {
    return timeAgoShort(time);
  });


}

if (Meteor.isServer) {

	Meteor.reactivePublish('pics', function(limit) {
		var query = {
			type: 'photo',
			hidden: {$exists: false}
		};

		var options = {
			sort: { created_time: -1 },
		};
		if (limit)
			options.limit = limit;

		var pageOptions = {
			// AniBoherBaShalom
			"663130193756030": {
				fromOther: false
			},
			// ArabsAndJews
			"417366255018379": {
				fromOther: true,
			}
		};

		query.$or = [];
		for (pageId in pageOptions) {
			var opts = pageOptions[pageId];
			var out = {};
			if (!opts.fromOther)
				out['from.id'] = pageId;
			// !(doc.status_type && doc.status_type == 'shared_story')
			out.pageId = pageId;
			query.$or.push(out);			
		}

		var self = this;
		var addedObjectIds = {};
		var publishedDocs = {};
		var handle = facebook.collections.feeds.find(query, options).observeChanges({
			added: function(id, doc) {
				if (!addedObjectIds[doc.object_id])
					self.added("pics", id, {
						pageId: doc.pageId,
						createdAt: new Date(doc.created_time),
						url: 'https://graph.facebook.com/' + doc.object_id + '/picture?type=album',
						likesCount: doc.likes && doc.likes.summary && doc.likes.summary.total_count,
						likeUrl: 'https://www.facebook.com/' + fbPageIds[doc.pageId] + '/posts/' + doc.postId,
						link: doc.link
					});
					publishedDocs[id] = 1;
				addedObjectIds[doc.object_id] = 1;
			},
			changed: function(id, fields) {
				if (!fields.likes || !fields.likes.summary || !publishedDocs[id])
					return;

				var data = {};
				data['likesCount'] = fields.likes.summary.total_count;
				self.changed('pics', id, data);
			},
			removed: function(id) {
				self.removed('pics', id);
			}
		});

	  self.onStop(function () {
  	  handle.stop();
  	});
//		return Pics.find({}, options);
	});

	Meteor.publish('pages', function() {
		return facebook.collections.pages.find({}, {
			fields: { likes: 1, name: 1, link: 1 }
		});
	});

	Meteor.publish('stats', function() {
		var self = this;

		/*
		var picsCount = 0;
		var picsInitted = true;
		var picsHandle = facebook.collections.feeds.find().observeChanges({
	    added: function (id, doc) {
	      picsCount++;
	      if (!picsInitted && doc.picture)
	        self.changed("stats", 'pics', {count: picsCount});
	    },
	    removed: function (id, doc) {
	    	if (doc.picture) {
		      picsCount--;
		      self.changed("stats", 'pics', {count: picsCount});
		    }
	    }
	  });
		*/

	  var usersCount = 0;
	  var usersInitted = true;
		var usersHandle = Meteor.users.find().observeChanges({
	    added: function (id) {
	      usersCount++;
	      if (!usersInitted)
	        self.changed("stats", 'users', {count: usersCount});
	    },
	    removed: function (id) {
	      usersCount--;
	      self.changed("stats", 'users', {count: usersCount});
	    }
	  });

//		picsInitted = false;
//	  self.added("stats", 'pics', {count: picsCount});
		usersInitted = false;
	  self.added("stats", 'users', {count: usersCount});

	  self.ready();

	  self.onStop(function () {
//	    picsHandle.stop();
	    usersHandle.stop();
	  });

	});

	/*
	facebook.on('feed', function(doc) {
		console.log('onFeed');
		console.log(doc);
		if (doc.type == 'photo' && (doc.to || !(doc.status_type && doc.status_type == 'shared_story'))) {
			Pics.upsert(doc.object_id, {
				_id: doc.object_id,
				pageId: doc.id.split('_')[0],
				createdAt: new Date(doc.created_time),
				//url: doc.picture
				url: 'https://graph.facebook.com/' + doc.object_id + '/picture?type=album'
			});
		}
	});
*/

	if (1 || process.env.NODE_ENV && process.env.NODE_ENV == "production") {
		Meteor.setInterval(function() {
			for (page in fbPages) {
				facebook.feed.get(fbPages[page]);
				facebook.page.get(fbPages[page], null, true);
			}
		}, 30000); // 30s
		Meteor.setInterval(function() {
			for (page in fbPages) {
				facebook.feed.updateCounts(fbPages[page]);
			}
		}, 120000); // 2m
	}

	/*
	var count = Pics.find({pageId: "417366255018379"}).count();
	if (!count) {
		facebook.collections.feeds.find({_id: /^417366255018379/}).forEach(facebook.hooks.feed[0]);
	}
	*/

}
