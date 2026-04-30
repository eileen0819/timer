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
    todayTotal: 0,
    todayTotalMinutes: 0,
    todayLabel: ''
  },

  onLoad: function (options) {
    const currentChild = store.getCurrentChild();
    const todayLabel = this.formatMonthDayFromDateStr(store.todayStr());
    this.setData({
      projectId: options.projectId || '',
      projectName: options.projectName || '未选择项目',
      childId: currentChild ? currentChild._id : '',
      todayLabel
    });
    this.loadTodayRecords();
  },

  onUnload: function () {
    this.stopTimer();
  },

  loadTodayRecords: function () {
    if (!this.data.projectId) return;

    const today = store.todayStr();
    const records = store.listRecordsByProjectAndDate({
      projectId: this.data.projectId,
      childId: this.data.childId,
      date: today
    });

    let total = 0;
    records.forEach((r) => (total += r.duration));
    this.setData({
      records,
      todayTotal: total,
      todayTotalMinutes: Math.floor(total / 60),
      todayLabel: this.formatMonthDayFromDateStr(today)
    });
  },

  formatMonthDayFromDateStr: function (dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return '';
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!m || !d) return '';
    return `${m}月${d}日`;
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

    store.addRecord({
      projectId: this.data.projectId,
      projectName: this.data.projectName,
      childId: this.data.childId,
      duration: this.data.currentTime
    });

    // 更新项目的总时长和今日时长
    this.updateProjectTime(this.data.currentTime);

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.resetTimer();
    this.loadTodayRecords();
  },

  updateProjectTime: function (duration) {
    store.updateProjectTime(this.data.projectId, duration);
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
