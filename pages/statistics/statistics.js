const store = require('../../utils/storage');

Page({
  data: {
    childId: '',
    weeklyData: [],
    weekTotalTime: 0,
    totalDays: 0,
    averageTime: 0,
    currentWeek: '',
    currentMonth: '',
    monthData: [],
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    allTimeTotal: 0,
    projectsData: []
  },

  onLoad: function () {
    const currentChild = store.getCurrentChild();
    if (currentChild) {
      this.setData({ childId: currentChild._id });
    }
    this.loadStatistics();
  },

  onShow: function () {
    const currentChild = store.getCurrentChild();
    if (currentChild && currentChild._id !== this.data.childId) {
      this.setData({ childId: currentChild._id });
      this.loadStatistics();
    }
  },

  loadStatistics: function () {
    if (!this.data.childId) return;
    this.loadWeeklyData();
    this.loadMonthlyData();
    this.loadProjectsData();
  },

  loadProjectsData: function () {
    const projects = store.listProjects(this.data.childId) || [];
    let allTimeTotal = 0;

    projects.sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0));
    projects.forEach((p) => (allTimeTotal += p.totalTime || 0));

    this.setData({
      projectsData: projects,
      allTimeTotal
    });
  },

  loadWeeklyData: function () {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    
    const weekStart = monday.toISOString().split('T')[0];

    const records = store.listRecordsByChildSince(this.data.childId, weekStart);
    this.processWeeklyData(records, weekStart);

    this.setData({
      currentWeek: this.formatWeekRange(monday)
    });
  },

  processWeeklyData: function (records, weekStart) {
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    let weekTotalTime = 0;
    
    records.forEach(record => {
      const recordDate = new Date(record.date);
      const dayIndex = Math.floor((recordDate - new Date(weekStart)) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        weekData[dayIndex] += record.duration;
        weekTotalTime += record.duration;
      }
    });
    
    this.setData({
      weeklyData: weekData,
      weekTotalTime: weekTotalTime
    });
  },

  loadMonthlyData: function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    this.setData({
      currentMonth: `${year}年${month}月`
    });
    
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

    const records = store.listRecordsByChildSince(this.data.childId, monthStart);
    this.processMonthlyData(records, year, month);
  },

  processMonthlyData: function (records, year, month) {
    const dayMap = {};
    let totalDays = 0;
    let monthTotalTime = 0;
    
    records.forEach(record => {
      const day = parseInt(record.date.split('-')[2]);
      if (!dayMap[day]) {
        dayMap[day] = 0;
      }
      dayMap[day] += record.duration;
    });
    
    const monthData = Object.keys(dayMap).map(day => ({
      day: parseInt(day),
      time: dayMap[day]
    })).sort((a, b) => a.day - b.day);
    
    totalDays = monthData.length;
    monthData.forEach(item => {
      monthTotalTime += item.time;
    });
    
    const averageTime = totalDays > 0 ? Math.round(monthTotalTime / totalDays) : 0;
    
    this.setData({
      monthData,
      totalDays,
      averageTime
    });
  },

  formatWeekRange: function (monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDate = (date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    };
    
    return `${formatDate(monday)} - ${formatDate(sunday)}`;
  },

  formatTime: function (seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  },

  getMaxWeeklyValue: function () {
    return Math.max(...this.data.weeklyData, 1);
  },

  getBarHeight: function (value) {
    const max = this.getMaxWeeklyValue();
    const height = Math.max((value / max) * 200, 4);
    return height;
  },

  hasRecord: function (day) {
    return this.data.monthData.some(item => item.day === day);
  }
});
