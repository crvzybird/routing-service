const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    // Serve the client-side code when the root URL is requested
    fs.readFile('client.html', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    // Return a 404 error for all other requests
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });

// Load the street data from the JSON file
const streetData = JSON.parse(fs.readFileSync('streets.json'));

// Handle WebSocket connections
wss.on('connection', (ws) => {
  let intervalId;

  // Receive the origin and destination street names from the client
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const origin = data.origin;
    const destination = data.destination;

    // Filter the directions to include only the ones that start and end at the given street names
    const filteredDirections = streetData.directions.filter(direction =>
      direction.start.includes(origin) && direction.end.includes(destination));

    // Stream the filtered directions to the client every 5 seconds
    let index = 0;
const sendDirections = () => {
  if (index >= filteredDirections.length) {
    ws.close();
    return;
  }

  const streetNames = filteredDirections[index].streetNames;
  for (let i = 0; i < streetNames.length; i++) {
    setTimeout(() => {
      ws.send(JSON.stringify({ streetName: streetNames[i] }));
    }, i * 1000);
  }
  index++;

  // Schedule the next call to sendDirections in 8 seconds
  setTimeout(sendDirections, 8000);
};

// Call sendDirections for the first time
sendDirections();
  });

  // Stop streaming data when the WebSocket connection is closed
  ws.on('close', () => {
    clearInterval(intervalId);
  });
});

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
