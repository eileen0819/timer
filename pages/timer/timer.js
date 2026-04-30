const store = require('../../utils/storage');

Page({
  data: {
    projectId: '',
    projectName: '',
    timer: null,
    isRunning: false,
    currentTime: 0,
    displayTime: '00:00:00',
    records: [],
    selectedDateStr: '',
    selectedDateMd: '',
    selectedTotalSeconds: 0,
    selectedTotalMinutes: 0,
    showManualDialog: false,
    inputDateMd: '',
    inputHours: '',
    inputMinutes: '',
    minuteOptions: [3, 5, 10, 15, 25, 35, 45, 60]
  },

  onLoad: function (options) {
    const currentChild = store.getCurrentChild();
    const selectedDateStr = store.todayStr();
    const selectedDateMd = this.formatMonthDayFromDateStr(selectedDateStr);
    this.setData({
      projectId: options.projectId || '',
      projectName: options.projectName || '未选择项目',
      childId: currentChild ? currentChild._id : '',
      selectedDateStr,
      selectedDateMd,
      inputDateMd: selectedDateMd
    });
    this.loadRecordsByDate(selectedDateStr);
  },

  onUnload: function () {
    this.stopTimer();
  },

  loadRecordsByDate: function (dateStr) {
    if (!this.data.projectId) return;

    const records = store.listRecordsByProjectAndDate({
      projectId: this.data.projectId,
      childId: this.data.childId,
      date: dateStr
    });

    let total = 0;
    records.forEach((r) => (total += r.duration));
    const selectedDateMd = this.formatMonthDayFromDateStr(dateStr);
    this.setData({
      records,
      selectedDateStr: dateStr,
      selectedDateMd,
      selectedTotalSeconds: total,
      selectedTotalMinutes: Math.floor(total / 60)
    });
  },

  stopBubble: function () {},

  formatMonthDayFromDateStr: function (dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return '';
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!m || !d) return '';
    return `${m}月${d}日`;
  },

  parseMonthDayToDateStr: function (text) {
    const raw = String(text || '').trim();
    if (!raw) return store.todayStr();
    const m = raw.match(/^\s*(\d{1,2})\s*(?:月|\/|-|\.)\s*(\d{1,2})\s*(?:日|号)?\s*$/);
    if (!m) return null;

    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    const year = new Date().getFullYear();

    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() + 1 !== month || dt.getDate() !== day) return null;

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  },

  onSelectedDateInput: function (e) {
    this.setData({ selectedDateMd: e.detail.value });
  },

  onSelectedDateBlur: function () {
    const dateStr = this.parseMonthDayToDateStr(this.data.selectedDateMd);
    if (!dateStr) {
      wx.showToast({ title: '日期格式不正确（如 4月30日）', icon: 'none' });
      this.setData({ selectedDateMd: this.formatMonthDayFromDateStr(this.data.selectedDateStr) });
      return;
    }
    this.loadRecordsByDate(dateStr);
  },

  showManualDialog: function () {
    this.setData({
      showManualDialog: true,
      inputHours: '',
      inputMinutes: '',
      inputDateMd: this.data.selectedDateMd || this.formatMonthDayFromDateStr(store.todayStr())
    });
  },

  hideManualDialog: function () {
    this.setData({ showManualDialog: false });
  },

  onHoursInput: function (e) {
    this.setData({ inputHours: e.detail.value });
  },

  onMinutesInput: function (e) {
    this.setData({ inputMinutes: e.detail.value });
  },

  onDateMdInput: function (e) {
    this.setData({ inputDateMd: e.detail.value });
  },

  onMinuteOptionChange: function (e) {
    const idx = parseInt(e.detail.value, 10);
    const v = this.data.minuteOptions && this.data.minuteOptions[idx];
    if (v === undefined || v === null) return;
    this.setData({ inputMinutes: String(v) });
  },

  saveManualRecord: function () {
    if (!this.data.childId) {
      wx.showToast({ title: '请先在首页添加/选择宝贝', icon: 'none' });
      return;
    }

    if (!this.data.projectId) {
      wx.showToast({ title: '请先选择项目', icon: 'none' });
      return;
    }

    const rawHours = parseInt(this.data.inputHours) || 0;
    const rawMinutes = parseInt(this.data.inputMinutes) || 0;

    if (rawHours === 0 && rawMinutes === 0) {
      wx.showToast({ title: '请输入有效时长', icon: 'none' });
      return;
    }

    if (rawHours < 0 || rawMinutes < 0) {
      wx.showToast({ title: '时长格式不正确', icon: 'none' });
      return;
    }

    const hours = rawHours + Math.floor(rawMinutes / 60);
    const minutes = rawMinutes % 60;
    const totalSeconds = (hours * 3600) + (minutes * 60);
    const recordDate = this.parseMonthDayToDateStr(this.data.inputDateMd);
    if (!recordDate) {
      wx.showToast({ title: '日期格式不正确（如 4月30日）', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    store.addRecord({
      projectId: this.data.projectId,
      projectName: this.data.projectName,
      childId: this.data.childId,
      duration: totalSeconds,
      date: recordDate
    });
    store.updateProjectTime(this.data.projectId, totalSeconds, recordDate);
    wx.hideLoading();

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.hideManualDialog();
    this.loadRecordsByDate(recordDate);
  },

  startTimer: function () {
    if (this.data.isRunning) return;
    
    this.setData({
      isRunning: true
    });
    
    this.data.timer = setInterval(() => {
      const newTime = this.data.currentTime + 1;
      this.setData({
        currentTime: newTime,
        displayTime: this.formatDisplayTime(newTime)
      });
    }, 1000);
  },

  pauseTimer: function () {
    this.stopTimer();
  },

  stopTimer: function () {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.data.timer = null;
    }
    this.setData({
      isRunning: false
    });
  },

  resetTimer: function () {
    this.stopTimer();
    this.setData({
      currentTime: 0,
      displayTime: '00:00:00'
    });
  },

  saveRecord: function () {
    if (this.data.currentTime === 0) {
      wx.showToast({
        title: '请先计时',
        icon: 'none'
      });
      return;
    }

    if (!this.data.childId) {
      wx.showToast({ title: '请先在首页添加/选择宝贝', icon: 'none' });
      return;
    }

    if (!this.data.projectId) {
      wx.showToast({ title: '请先选择项目', icon: 'none' });
      return;
    }

    const recordDate = this.data.selectedDateStr || store.todayStr();
    store.addRecord({
      projectId: this.data.projectId,
      projectName: this.data.projectName,
      childId: this.data.childId,
      duration: this.data.currentTime,
      date: recordDate
    });

    // 更新项目的总时长和今日时长
    this.updateProjectTime(this.data.currentTime, recordDate);

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.resetTimer();
    this.loadRecordsByDate(recordDate);
  },

  updateProjectTime: function (duration, recordDateStr) {
    store.updateProjectTime(this.data.projectId, duration, recordDateStr);
  },

  formatDisplayTime: function (seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [hours, minutes, secs]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  },

  formatDuration: function (seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  },

  getTodayTotal: function () {
    let total = 0;
    this.data.records.forEach(record => {
      total += record.duration;
    });
    return total;
  }
});
