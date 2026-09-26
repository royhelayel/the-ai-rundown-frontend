// Returns the current UAE date as YYYY-MM-DD, correctly for all browser timezones
export const toUAEDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(d);

// Returns current UAE hour 0–23, correctly for all browser timezones
export const getUAEHour = () => {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai', hour: 'numeric', hour12: false }));
  return h === 24 ? 0 : h;
};
