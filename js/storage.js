const STORAGE_KEYS = {
  PROFILE: 'app_cat_profile',
  TASKS: 'app_daily_tasks',
  LOGS: 'app_behavior_logs'
};
// --- Utilities ---
function generateId() {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
// --- Profile Storage ---
function getProfile() {
  const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return data ? JSON.parse(data) : null;
}
function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}
// --- Tasks Storage ---
function getTasks() {
  const data = localStorage.getItem(STORAGE_KEYS.TASKS);
  return data ? JSON.parse(data) : [];
}
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}
function getTasksToday() {
  const today = getTodayString();
  const tasks = getTasks();
  return tasks.filter(t => t.date === today);
}
function updateTask(id, updates) {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasks(tasks);
    return true;
  }
  return false;
}
function incrementTaskSnooze(id) {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) {
      if (!tasks[idx].remindCount) tasks[idx].remindCount = 0;
      tasks[idx].remindCount += 1;
      // Trì hoãn 1 tiếng
      let [hours, mins] = tasks[idx].scheduledTime.split(':').map(Number);
      hours += 1;
      if (hours >= 24) hours = hours - 24;
      tasks[idx].scheduledTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      tasks[idx].status = 'snoozed';
      saveTasks(tasks);
      return tasks[idx].remindCount;
  }
  return -1;
}
// --- Behavior Logs Storage ---
function getLogs() {
  const data = localStorage.getItem(STORAGE_KEYS.LOGS);
  return data ? JSON.parse(data) : [];
}
function addLog(state) {
  const logs = getLogs();
  const newLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    state: state
  };
  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  return newLog;
}
// Check if cat is completely calm (last log within 1 hour)
function isCatCalm() {
    const logs = getLogs();
    if(logs.length === 0) return true; // Default behavior
    const lastLog = logs[logs.length - 1];
    const logTime = new Date(lastLog.timestamp).getTime();
    const now = Date.now();
    // if state is not calm, and recorded less than 2 hour ago -> Not calm
    if (lastLog.state !== 'calm' && (now - logTime) < 2 * 60 * 60 * 1000) {
        return false;
    }
    return true;
}
window.StorageBox = {
  getProfile, saveProfile,
  getTasks, saveTasks, getTasksToday, updateTask, incrementTaskSnooze,
  getLogs, addLog,
  getTodayString, generateId, isCatCalm
};
