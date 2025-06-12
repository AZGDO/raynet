export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function load(key) {
  const v = localStorage.getItem(key);
  return v ? JSON.parse(v) : null;
}
