const fetch = require('node-fetch');

async function checkResponse() {
  try {
    const response = await fetch('https://discordbot-eirh.onrender.com');
    if (response.ok) {
      console.log('Application running.');
    } else {
      console.error('Error Checking Application:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error Checking Application:', error.message);
  }
}

const responseInterval = 5 * 60 * 1000; // 5 minutes

checkResponse();

// Start sending pings at the specified interval
setInterval(checkResponse, responseInterval);
