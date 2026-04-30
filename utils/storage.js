// 本地存储数据层（不依赖云开发）
// 说明：
// - children：宝贝档案列表
// - childProfile：当前选中的宝贝
// - projects：项目列表（按 childId 关联）
// - records：计时/手动录入记录（按 childId + projectId 关联）

const KEYS = {
  CHILDREN: 'childrenList',
  CURRENT_CHILD: 'childProfile',
  PROJECTS: 'projects',
  RECORDS: 'records'
};

function safeGet(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === undefined || v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nowTimeStr() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/* ================= Children ================= */
function listChildren() {
  return safeGet(KEYS.CHILDREN, []);
}

function addChild({ name, birthMonth }) {
  const children = listChildren();
  const child = {
    _id: genId('child'),
    name,
    birthMonth: birthMonth || null,
    createTime: Date.now()
  };
  children.push(child);
  safeSet(KEYS.CHILDREN, children);
  return child;
}

function getCurrentChild() {
  return safeGet(KEYS.CURRENT_CHILD, null);
}

function setCurrentChild(child) {
  safeSet(KEYS.CURRENT_CHILD, child || null);
}

/* ================= Projects ================= */
function listProjectsAll() {
  return safeGet(KEYS.PROJECTS, []);
}

function saveProjectsAll(projects) {
  safeSet(KEYS.PROJECTS, projects || []);
}

function normalizeProjectsForToday(projects) {
  const today = todayStr();
  let changed = false;
  const next = (projects || []).map((p) => {
    if (p && p.lastRecordDate && p.lastRecordDate !== today && (p.todayTime || 0) !== 0) {
      changed = true;
      return { ...p, todayTime: 0 };
    }
    return p;
  });
  return { projects: next, changed };
}

function listProjects(childId) {
  const all = listProjectsAll();
  const { projects: normalized, changed } = normalizeProjectsForToday(all);
  if (changed) saveProjectsAll(normalized);
  return (normalized || []).filter((p) => p.childId === childId);
}

function addProject({ name, category, color, childId, targetTime }) {
  const all = listProjectsAll();
  const project = {
    _id: genId('project'),
    name,
    category: category || 'other',
    color: color || '#4A90E2',
    childId,
    totalTime: 0,
    todayTime: 0,
    targetTime: typeof targetTime === 'number' ? targetTime : 3600,
    createTime: Date.now(),
    lastRecordDate: null
  };
  all.unshift(project);
  saveProjectsAll(all);
  return project;
}

function updateProject(projectId, patch) {
  const all = listProjectsAll();
  const idx = all.findIndex((p) => p._id === projectId);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...(patch || {}) };
  saveProjectsAll(all);
  return all[idx];
}

function updateProjectTime(projectId, durationSeconds, recordDateStr) {
  const all = listProjectsAll();
  const idx = all.findIndex((p) => p._id === projectId);
  if (idx === -1) return null;

  const today = todayStr();
  const recordDate = recordDateStr || today;
  const p = all[idx];
  const totalTime = (p.totalTime || 0) + durationSeconds;

  if (recordDate !== today) {
    all[idx] = { ...p, totalTime };
    saveProjectsAll(all);
    return all[idx];
  }

  let todayTime = p.todayTime || 0;
  let lastRecordDate = p.lastRecordDate || null;

  if (lastRecordDate !== today) {
    todayTime = durationSeconds;
    lastRecordDate = today;
  } else {
    todayTime = todayTime + durationSeconds;
  }

  all[idx] = { ...p, totalTime, todayTime, lastRecordDate };
  saveProjectsAll(all);
  return all[idx];
}

/* ================= Records ================= */
function listRecordsAll() {
  return safeGet(KEYS.RECORDS, []);
}

function saveRecordsAll(records) {
  safeSet(KEYS.RECORDS, records || []);
}

function addRecord({ projectId, projectName, childId, duration, date }) {
  const all = listRecordsAll();
  const record = {
    _id: genId('record'),
    projectId,
    projectName,
    childId,
    duration,
    date: date || todayStr(),
    createTime: nowTimeStr()
  };
  all.unshift(record);
  saveRecordsAll(all);
  return record;
}

function listRecordsByChildSince(childId, startDateStr) {
  const all = listRecordsAll();
  return all.filter((r) => r.childId === childId && r.date >= startDateStr);
}

function listRecordsByProjectAndDate({ projectId, childId, date }) {
  const all = listRecordsAll();
  return all.filter(
    (r) => r.childId === childId && r.projectId === projectId && r.date === date
  );
}

module.exports = {
  // children
  listChildren,
  addChild,
  getCurrentChild,
  setCurrentChild,
  // projects
  listProjects,
  addProject,
  updateProject,
  updateProjectTime,
  // records
  addRecord,
  listRecordsByChildSince,
  listRecordsByProjectAndDate,
  // helpers (for pages)
  todayStr
};
