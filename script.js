 //   Function to get Location. Returns a promise that resolves into (lat, long)
      function getLocation() {
        // Creates a new promise
        let locationPromise = new Promise((resolve, reject) => {
          // Accesses the current position of the user:
          navigator.geolocation.getCurrentPosition((pos) => {
            // Grabs the lat and long
            let long = pos.coords.longitude;
            let lat = pos.coords.latitude;
            // Resolves the promise with an object containing lat and long
            resolve({ lat, long });
          }, reject);
        });
        //   returns the promise
        return locationPromise;
      }



$(function () {
  
  loadLogs();

  // handles form submit
  $('#tripForm').on('submit', function (event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const date = formData.get('tripDate');
    const notes = formData.get('notes') || '';

    // gets geolocation
    getLocation()
      .then(({ lat, long }) => {
        // build Open-Meteo URL
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&daily=sunrise,sunset&current_weather=true&timezone=auto&forecast_days=1&temperature_unit=fahrenheit`;
        return axios.get(url).then((res) => ({ res, lat, long }));
      })
      .then(({ res, lat, long }) => {
        const data = res.data || {};
        const sunriseTime = data.daily && data.daily.sunrise && data.daily.sunrise[0] ? data.daily.sunrise[0] : '';
        const sunsetTime = data.daily && data.daily.sunset && data.daily.sunset[0] ? data.daily.sunset[0] : '';
        const temperature = data.current_weather && typeof data.current_weather.temperature !== 'undefined' ? data.current_weather.temperature : null;

        const logEntry = {
          latitude: Number(lat),
          longitude: Number(long),
          date: date,
          sunriseTime: sunriseTime,
          sunsetTime: sunsetTime,
          notes: notes,
          temperature: temperature,
        };

        // saves to localStorage
        const key = 'huntingLogs';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(logEntry);
        localStorage.setItem(key, JSON.stringify(existing));

        // refreshes UI
        loadLogs();

        // resets form
        form.reset();
      })
      .catch((err) => {
        console.error(err);
        alert('Could not save log: ' + (err.message || err));
      });
  });
});

function loadLogs() {
  const key = 'huntingLogs';
  const container = $('#logContainer');
  const raw = localStorage.getItem(key);
  if (!raw) {
    container.html('<p>No logs saved yet.</p>');
    return;
  }

  let logs = [];
  try {
    logs = JSON.parse(raw) || [];
  } catch (e) {
    console.error('Failed to parse logs', e);
    container.html('<p>No logs saved yet.</p>');
    return;
  }

  if (!logs.length) {
    container.html('<p>No logs saved yet.</p>');
    return;
  }

  const itemsHtml = logs
    .map((log) => {
      const lat = (log.latitude || 0).toFixed ? log.latitude.toFixed(4) : log.latitude;
      const lon = (log.longitude || 0).toFixed ? log.longitude.toFixed(4) : log.longitude;
      return `
        <div class="log-item card">
          <p><strong>Date:</strong> ${log.date}</p>
          <p><strong>Coordinates:</strong> ${lat}, ${lon}</p>
          <p><strong>Sunrise:</strong> ${log.sunriseTime || 'N/A'}</p>
          <p><strong>Sunset:</strong> ${log.sunsetTime || 'N/A'}</p>
          <p><strong>Temperature:</strong> ${log.temperature !== null && typeof log.temperature !== 'undefined' ? log.temperature + ' °F' : 'N/A'}</p>
          <p><strong>Notes:</strong> ${log.notes || ''}</p>
        </div>
      `;
    })
    .join('');

  container.html(itemsHtml);
}
