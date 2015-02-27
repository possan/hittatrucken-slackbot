# HittaTrucken foodtruck-bot for Slack

A quick hack that uses the "open" nature of firebase and some reverse engineering of the [hittatrucken](http://hittatrucken.se) javascript to get all the trucks and their current location, sort it by distance to your location and post that into your Slack channel of choice.

## Configuration

Edit the `config` object in `bot.js` to fit your needs:

```JavaScript
var config = {
    "lat": 59.3422253, // Your location, latitude
    "lng": 18.0639128, // Your location, longitude
    "max_distance": 1500, // Maximum distance in meters
    "max_recs": 4, // Maximum number of hits to post
    "boticon": "https://m1.behance.net/rendition/modules/86579007/disp/b3770565b3f468854f9f7fe706e3dd97.png",
    "slackchannel": "#mychannel", // Your channel
    "slackurl": null // Your incoming webhook url
}
```


## Installation

```bash
npm install
```


## Run

Run the script just before lunchtime.

```bash
node bot.js
```


## Schedule it!

Edit `bot.sh` and `bot.plist` to reflect the location where you installed the script and where your `node` lives, then to install it:

```
cp bot.plist ~/Library/LaunchAgents/truckbot.plist
launchctl load ~/Library/LaunchAgents/truckbot.plist
launchctl start se.possan.truckbot
```

To stop the job, just run

```
launchctl stop se.possan.truckbot
launchctl unload ~/Library/LaunchAgents/truckbot.plist
```

