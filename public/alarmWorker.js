// Background Web Worker for Prabhat Nepali Alarm Clock
// Web Workers run in a background thread and are not throttled like DOM window timers.

let timerId = null;

self.onmessage = function (e) {
  const { action, interval } = e.data;

  if (action === 'start') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
    }, interval || 1000);
  } else if (action === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
