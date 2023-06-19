
const express = require('express');
const spdy = require('spdy');
const fs = require('fs');

const app = express();
const receivers = new Map();

app.set('query parser', 'simple');

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
});

app.post('/send', (req, res) => {
  const channel = req.query.channel;
  if (!channel) {
    res.status(400).send('No channel given');
    return;
  }
  
  res.status(200);
  
  req.on('data', (chunk) => {
    const set = receivers.get(channel);
    if (!set) return;
    for (const res of set) res.write(chunk);
  });
  
  req.on('end', (chunk) => {
    if (res.writableEnded) return;
    res.send('Ended');
  });
});

app.get('/receive', (req, res) => {
  const channel = req.query.channel;
  if (!channel) {
    res.status(400).send('No channel given');
    return;
  }
  
  if (!receivers.has(channel)) {
    receivers.set(channel, new Set());
  }
  
  receivers.get(channel).add(res);
  
  res.on('close', () => {
    const set = receivers.get(channel);
    set.delete(res);
    if (set.size === 0) receivers.delete(channel);
  });
  
  res.status(200);
  res.set('Content-Type', 'text/plain');
});

app.use(express.static('static'));

const port = process.env.PORT || 3000;

spdy
  .createServer(
    {
      key: fs.readFileSync("./server.key"),
      cert: fs.readFileSync("./server.crt"),
    },
    app
  )
 .listen(port, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`Listening on port ${port}`);
  });