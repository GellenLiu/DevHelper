const http = require('http');
const url = require('url');

class SSEHandler {
  constructor(config) {
    this.config = config;
  }

  handle(req, res, sseConfig) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });

    const sendEvent = (event) => {
      const eventData = typeof event.data === 'object' ? JSON.stringify(event.data) : event.data;
      let message = '';
      if (event.id) message += `id: ${event.id}\n`;
      if (event.event) message += `event: ${event.event}\n`;
      message += `data: ${eventData}\n\n`;
      res.write(message);
    };

    const streamEvents = async () => {
      if (sseConfig.delay > 0) {
        await this.sleep(sseConfig.delay);
      }

      let eventIndex = 0;
      const events = sseConfig.events;
      const interval = sseConfig.interval || 1000;
      const repeat = sseConfig.repeat || false;

      const sendNextEvent = () => {
        if (res.writableEnded) return;

        if (eventIndex < events.length) {
          sendEvent(events[eventIndex]);
          eventIndex++;
          setTimeout(sendNextEvent, interval);
        } else if (repeat) {
          eventIndex = 0;
          setTimeout(sendNextEvent, interval);
        } else {
          res.end();
        }
      };

      sendNextEvent();
    };

    req.on('close', () => {
      res.end();
    });

    streamEvents();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = SSEHandler;
