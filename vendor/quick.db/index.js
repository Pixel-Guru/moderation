const fs = require("node:fs");
const path = require("node:path");

const databasePath = path.join(process.cwd(), "quickdb.json");

function readDatabase() {
  try {
    if (!fs.existsSync(databasePath)) return {};
    return JSON.parse(fs.readFileSync(databasePath, "utf8"));
  } catch {
    return {};
  }
}

function writeDatabase(data) {
  fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
}

function get(key) {
  const data = readDatabase();
  return Object.hasOwn(data, key) ? data[key] : null;
}

function set(key, value) {
  const data = readDatabase();
  data[key] = value;
  writeDatabase(data);
  return value;
}

function add(key, value) {
  const current = Number(get(key) || 0);
  return set(key, current + Number(value || 0));
}

function subtract(key, value) {
  const current = Number(get(key) || 0);
  return set(key, current - Number(value || 0));
}

function deleteKey(key) {
  const data = readDatabase();
  const existed = Object.hasOwn(data, key);
  delete data[key];
  writeDatabase(data);
  return existed;
}

function has(key) {
  return get(key) !== null;
}

function all() {
  const data = readDatabase();
  return Object.entries(data).map(([ID, dataValue]) => ({
    ID,
    data: dataValue,
  }));
}

module.exports = {
  add,
  all,
  delete: deleteKey,
  fetch: get,
  get,
  has,
  set,
  subtract,
};
