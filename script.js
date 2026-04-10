// Function to get Location. Returns a promise that resolves into {latitude, longitude}
function getLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        resolve({ latitude, longitude });
      },
      reject
    );
  });
}

// Escape text for safe HTML insertion
function escapeHtml(str) {
  if (str == null) return '';
  return $('<div>').text(String(str)).html();
}

// Load and render logs from localStorage
function loadLogs() {
  const key = 'huntingLogs';
  const raw = localStorage.getItem(key);
  if (!raw) {
    $('#logContainer').html('<p>No logs yet.</p>');
    return;
  }
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    arr = [];
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    $('#logContainer').html('<p>No logs yet.</p>');
    return;
  }

  const html = arr
    .map((entry) => {
      const date = entry.date || '';
      const latitude = entry.latitude;
      const longitude = entry.longitude;
      const sunriseTime = entry.sunriseTime || '';
      const sunsetTime = entry.sunsetTime || '';
      const notes = escapeHtml(entry.notes || '');
      const temperature = (entry.temperature !== undefined && entry.temperature !== null) ? entry.temperature + ' °F' : 'N/A';

      const latText = (typeof latitude === 'number' && latitude.toFixed) ? latitude.toFixed(4) : latitude;
      const longText = (typeof longitude === 'number' && longitude.toFixed) ? longitude.toFixed(4) : longitude;

      return `
        <div class="log">
          <div><strong>Date:</strong> ${date}</div>
          <div><strong>Coords:</strong> ${latText}, ${longText}</div>
          <div><strong>Sunrise:</strong> ${escapeHtml(sunriseTime)}</div>
          <div><strong>Sunset:</strong> ${escapeHtml(sunsetTime)}</div>
          <div><strong>Temp:</strong> ${escapeHtml(temperature)}</div>
          <div><strong>Notes:</strong> ${notes}</div>
        </div>
      `;
    })
    .join('\n');

  $('#logContainer').html(html);
}

// DOM ready: hook form submit and initialize UI
$(function () {
  loadLogs();

  $('#tripForm').on('submit', async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const date = fd.get('tripDate');
    const notes = fd.get('notes') || '';

    try {
      const { latitude, longitude } = await getLocation();

      // Build Open-Meteo URL (request daily sunrise/sunset and current weather)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset&current_weather=true&timezone=auto&forecast_days=1&temperature_unit=fahrenheit`;

      const res = await axios.get(url);
      const data = res.data || {};

      const sunriseTime = (data.daily && data.daily.sunrise && data.daily.sunrise[0]) || '';
      const sunsetTime = (data.daily && data.daily.sunset && data.daily.sunset[0]) || '';

      let temperature = null;
      if (data.current_weather && typeof data.current_weather.temperature !== 'undefined') {
        temperature = data.current_weather.temperature;
      } else if (data.current && typeof data.current.temperature_2m !== 'undefined') {
        temperature = data.current.temperature_2m;
      } else if (Array.isArray(data.hourly && data.hourly.temperature_2m) && data.hourly.temperature_2m.length) {
        temperature = data.hourly.temperature_2m[0];
      }

      const logEntry = {
        latitude,
        longitude,
        date,
        sunriseTime,
        sunsetTime,
        notes,
        temperature,
      };

      const key = 'huntingLogs';
      const existing = localStorage.getItem(key);
      const arr = existing ? JSON.parse(existing) : [];
      arr.push(logEntry);
      localStorage.setItem(key, JSON.stringify(arr));

      loadLogs();
      form.reset();
    } catch (err) {
      console.error(err);
      alert('Could not save log: ' + (err && err.message ? err.message : err));
    }
  });
});
