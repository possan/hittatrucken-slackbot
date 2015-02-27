var config = {
	lat: 59.3422253, // Your location, latitude
	lng: 18.0639128, // Your location, longitude
	max_distance: 1500, // Maximum distance in meters
	max_recs: 4, // Maximum number of hits to post
	boticon: 'https://m1.behance.net/rendition/modules/86579007/disp/b3770565b3f468854f9f7fe706e3dd97.png',
	slackchannel: '#mychannel', // Your channel
	slackurl: null // Your incoming webhook url
};

var Firebase = require('firebase');
var Q = require('Q');
var request  = require('request');

function getAllDates() {
	var future = Q.defer();
	var datesRef = new Firebase("https://hittatrucken.firebaseio.com/dates");
	datesRef.on("value",function(lsnap) {
		var val = lsnap.val();
		console.log('got all dates');
		future.resolve(val);
	});
	return future.promise;
}

function getAllTrucks() {
	var future = Q.defer();
	var trucksRef = new Firebase("https://hittatrucken.firebaseio.com/trucks/");
	trucksRef.on("value",function(snap) {
		var trucks = snap.val();
		var filteredtrucks = [];
		console.log('got trucks');
		for(truckid in trucks) {
			var truck = trucks[truckid];
			if (truck.hidden)
				continue;
			truck.id = truckid;
			filteredtrucks.push(truck);
		}
		future.resolve(filteredtrucks);
	});
	return future.promise;
}

function getTodaysLocationUpdates(dates) {
	var two = function(d) { var s = '' + d; if (s.length < 2) s = '0' + s; return s; }
	var d = (new Date());
	var date = d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate());
	console.log('todays date', date);
	var future = Q.defer();
	dates.then(function(alldates) {
		if (alldates[date]) {
			future.resolve(alldates[date].stops || {});
		} else {
			future.resolve({});
		}
	});
	return future.promise;
}

function cleanHour(date) {
	var h = parseInt(date, 10);
	// console.log('cleanHour', date, h);
	return h;
}

function distance(lat1, lon1, lat2, lon2, unit) {
    var radlat1 = Math.PI * lat1/180
    var radlat2 = Math.PI * lat2/180
    var radlon1 = Math.PI * lon1/180
    var radlon2 = Math.PI * lon2/180
    var theta = lon1-lon2
    var radtheta = Math.PI * theta/180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515
    if (unit=="K") { dist = dist * 1.609344 }
    if (unit=="M") { dist = dist * 1000.0 * 1.609344 }
    if (unit=="N") { dist = dist * 0.8684 }
    return dist
}


function getNearbyTrucks(trucks, date) {
	var hour = config.hour ? config.hour : ((new Date()).getHours());
	console.log('current hour', hour);
	var future = Q.defer();
	trucks.then(function(alltrucks) {
		date.then(function(dateupdates) {
			console.log('got all trucks and all dates');

			var nearbytrucks = [];

			alltrucks.forEach(function(t) {
				// console.log('check one truck', t.id, t.name, t.twitter, t.instagramid);

				t.dates = [];

				for(var k in dateupdates) {
					var dt = dateupdates[k];
					if (dt.truck == t.id) {
						// console.log('check date', dt);
						var from_hour = cleanHour(dt.from);
						var to_hour = cleanHour(dt.to);
						if (from_hour && to_hour && hour >= from_hour && hour <= to_hour) {
							t.location = { lat: dt.lat, lng: dt.lng, name: dt.where };
							t.distance = distance(dt.lat, dt.lng, config.lat, config.lng, 'M');
							t.lastdate = dt;
						}
					}
				}

				if (t.lastdate && t.distance < config.max_distance) {
					nearbytrucks.push(t);
				}
			});

			future.resolve(nearbytrucks);
		});
	});

	return future.promise;
}

function sendNotice(msg, name, links) {
	var future = Q.defer();

	var payload = {
	    text: msg,
	    channel: config.slackchannel,
	    username: name,
	    icon_url: config.boticon,
	}

	console.log('send slack payload', payload);

	if (config.slackurl) {
		var option = {
			url:   config.slackurl,
			body:  JSON.stringify(payload)
		};
		var req = request.post(option, function(err, res, body) {
			if (!err && body != 'ok') {
				err = { message: body };
				body = null;
			}
			err ? future.reject(err) : future.resolve({res: res, body: body});
			return null;
		});
	} else {
		future.resolve(true);
	}

	return future.promise;
}

var trucks = getAllTrucks();
var dates = getAllDates();
var todaysdate = getTodaysLocationUpdates(dates);
var currentlocations = getNearbyTrucks(trucks, todaysdate);
currentlocations.then(function(data) {
	data.sort(function(a, b) {
		if (a.distance < b.distance) return -1;
		if (a.distance > b.distance) return 1;
		return 0;
	});
	var all_pushes = [];
	data.forEach(function(t) {
		if (all_pushes.length < config.max_recs) {
			var link = t.instagramid ? ('http://instagram.com/' + t.instagramid) : t.twitter;
			var msg = 'I\'m ' + Math.round(t.distance)+'m away at ' + t.lastdate.where + ' between ' + t.lastdate.from + ' and ' + t.lastdate.to + ' (' + t.short_description + ') ' + link;
			all_pushes.push(sendNotice(msg, t.name));
		}
	});
	Q.allSettled(all_pushes).then(function(data) {
		console.log('all pushes done.', data);
		process.exit(1);
	});
});
