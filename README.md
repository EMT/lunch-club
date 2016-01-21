# Lunch Club

## Local Setup

```
git clone https://github.com/EMT/lunch-club.git
cd lunch-club
npm install
```

### Running the slack bot

```
cd slack
token=<slack api token here> node convo-bot.js
```

### Running the site

```
cd site
node site.js
```

## Server Commands

### Checking if everything is still running

```
pm2 list
```

### Updating on the server

```
cd /var/www/lunch-club
git pull
sudo pm2 restart
```

### Starting up again

If the server crashes, pm2 should automatically bring both the processes back up. If it fails to do this and `pm2 list` shows no active processes then use these commands to re-add them.

```
cd /var/www/lunch-club/site/
pm2 start site.js

cd ../slack/
pm2 start convo-bot.js

pm2 list
```