const store = require('../../utils/storage');

Page({
  data: {
    projects: [],
    groupedProjects: [],
    categories: [
      { id: 'book', name: '绘本', icon: '📚' },
      { id: 'song', name: '儿歌', icon: '🎵' },
      { id: 'video', name: '动画片', icon: '🎬' },
      { id: 'other', name: '其他', icon: '📦' }
    ],
    showAddDialog: false,
    newProjectName: '',
    newProjectCategory: 'book',
    showTimeDialog: false,
    selectedProjectId: '',
    selectedProjectName: '',
    inputHours: '',
    inputMinutes: '',
    showWelcomePage: false,
    childNameInput: '',
    childBirthMonth: '',
    childrenList: [],
    currentChild: null,
    showSwitchChildDialog: false,
    showAddChildDialog: false,
    newChildNameInput: '',
    newChildBirthMonth: '',
    currentDate: '',
    isFirstLoad: true
  },

  onLoad: function () {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    if (mm < 10) mm = '0' + mm;
    this.setData({ currentDate: `${yyyy}-${mm}` });
    
    this.checkChildProfile();
    // 临时挂载导入函数，供测试调用（本地模式下会提示不可用）
    wx.importResourcesData = this.importResourcesData.bind(this);
  },

  importResourcesData: function () {
    // 本次需求选择“本地存储”，因此云端资源导入先禁用，避免无云环境报错
    wx.showToast({ title: '本地模式暂不支持导入云资源', icon: 'none' });
    return;
    // wx.showLoading({ title: '导入资源中...' });
    // const db = wx.cloud.database();
    
    // 引入转换为 JS 模块的预置数据
    let resourcesData = [];
    try {
      const data = require('../../data/preset_resources.js');
      resourcesData = data.resources || [];
    } catch (e) {
      console.error('读取预置数据失败', e);
    }
    
    if (!resourcesData || resourcesData.length === 0) {
      wx.hideLoading();
      wx.showToast({ title: '未找到预置数据', icon: 'none' });
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const total = resourcesData.length;

    resourcesData.forEach(item => {
      db.collection('resources').add({
        data: {
          category: item.category,
          name: item.name,
          name_en: item.name_en,
          description: item.description,
          recommended_age: item.recommended_age,
          total_episodes: item.total_episodes,
          stage: item.stage,
          source: item.source || 'system',
          status: item.status || 'active',
          episodes: item.episodes || [],
          createTime: db.serverDate()
        },
        success: () => {
          successCount++;
          this.checkImportDone(successCount, failCount, total);
        },
        fail: (err) => {
          console.error('导入单条失败', err);
          failCount++;
          this.checkImportDone(successCount, failCount, total);
        }
      });
    });
  },

  checkImportDone: function (success, fail, total) {
    if (success + fail === total) {
      wx.hideLoading();
      wx.showModal({
        title: '导入完成',
        content: `成功: ${success} 条，失败: ${fail} 条`,
        showCancel: false
      });
      
      // 验证数据
      if (wx.cloud && wx.cloud.database) {
        wx.cloud.database().collection('resources').count().then(res => {
          console.log('云端 resources 集合总记录数:', res.total);
        });
      }
    }
  },

  onShow: function () {
    if (!this.data.isFirstLoad && this.data.currentChild) {
      this.checkChildProfile(); // Refresh list in case of changes
    }
  },

  checkChildProfile: function () {
    const childrenList = store.listChildren();
    if (!childrenList || childrenList.length === 0) {
      this.setData({
        showWelcomePage: true,
        childrenList: [],
        currentChild: null,
        isFirstLoad: false
      });
      return;
    }

    let current = store.getCurrentChild();
    if (!current || !childrenList.find((c) => c._id === current._id)) {
      current = childrenList[0];
      store.setCurrentChild(current);
    } else {
      // 同步最新信息（如果你后续加“编辑宝贝”，这里会更有用）
      current = childrenList.find((c) => c._id === current._id);
      store.setCurrentChild(current);
    }

    this.setData({
      childrenList,
      currentChild: current,
      showWelcomePage: false,
      isFirstLoad: false
    });

    this.loadProjects();
  },

  onChildNameInput: function (e) {
    this.setData({ childNameInput: e.detail.value });
  },

  onChildBirthMonthChange: function (e) {
    this.setData({ childBirthMonth: e.detail.value });
  },

  saveChildProfile: function () {
    const name = this.data.childNameInput.trim();
    const birthMonth = this.data.childBirthMonth;
    
    if (!name) {
      wx.showToast({ title: '请输入宝贝的昵称呀~', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    const newChild = store.addChild({ name, birthMonth });
    store.setCurrentChild(newChild);
    wx.hideLoading();
    wx.showToast({ title: '欢迎宝贝！', icon: 'success' });

    this.setData({
      showWelcomePage: false,
      childNameInput: '',
      childBirthMonth: ''
    });

    this.checkChildProfile();
  },

  /* ================= 宝贝切换 & 添加新宝贝 ================= */
  showSwitchChildDialog: function() {
    this.setData({ showSwitchChildDialog: true });
  },

  hideSwitchChildDialog: function() {
    this.setData({ showSwitchChildDialog: false });
  },

  switchChild: function(e) {
    const selectedChild = e.currentTarget.dataset.child;
    if (this.data.currentChild._id === selectedChild._id) {
      this.hideSwitchChildDialog();
      return;
    }
    
    store.setCurrentChild(selectedChild);
    this.setData({
      currentChild: selectedChild,
      showSwitchChildDialog: false
    });
    
    wx.showToast({ title: `已切换至 ${selectedChild.name}`, icon: 'none' });
    this.loadProjects();
  },

  showAddChildDialog: function() {
    this.setData({
      showSwitchChildDialog: false,
      showAddChildDialog: true,
      newChildNameInput: '',
      newChildBirthMonth: ''
    });
  },

  hideAddChildDialog: function() {
    this.setData({ showAddChildDialog: false });
  },

  onNewChildNameInput: function(e) {
    this.setData({ newChildNameInput: e.detail.value });
  },

  onNewChildBirthMonthChange: function(e) {
    this.setData({ newChildBirthMonth: e.detail.value });
  },

  confirmAddChild: function() {
    const name = this.data.newChildNameInput.trim();
    const birthMonth = this.data.newChildBirthMonth;
    
    if (!name) {
      wx.showToast({ title: '请输入宝贝的昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '添加中...' });
    const newChild = store.addChild({ name, birthMonth });
    store.setCurrentChild(newChild);
    wx.hideLoading();
    wx.showToast({ title: '添加成功', icon: 'success' });

    this.setData({ showAddChildDialog: false });
    this.checkChildProfile(); // 重新加载全部宝贝和数据
  },

  loadProjects: function () {
    if (!this.data.currentChild) return;
    const rawProjects = store.listProjects(this.data.currentChild._id);
    this.processGroupedProjects(rawProjects);
  },

  processGroupedProjects: function (rawProjects) {
    const groups = {};
    let totalTodaySeconds = 0;
    
    // 初始化预设分类分组
    this.data.categories.forEach(cat => {
      groups[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        items: []
      };
    });

    // 分配项目到各个分组
    rawProjects.forEach(project => {
      const catId = project.category || 'other'; // 兼容老数据，默认放到"其他"
      if (groups[catId]) {
        groups[catId].items.push(project);
      } else {
        groups['other'].items.push(project);
      }
      
      // 累加今日专注总时长
      totalTodaySeconds += (project.todayTime || 0);
    });

    // 转换为数组并过滤掉空分组
    const groupedProjects = Object.values(groups).filter(group => group.items.length > 0);
    const totalTodayMinutes = Math.floor(totalTodaySeconds / 60);

    this.setData({
      projects: rawProjects,
      groupedProjects: groupedProjects,
      totalTodayMinutes: totalTodayMinutes
    });
  },

  goToStatistics: function () {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  showAddProject: function () {
    this.setData({
      showAddDialog: true,
      newProjectName: '',
      newProjectCategory: 'book'
    });
  },

  hideAddDialog: function () {
    this.setData({
      showAddDialog: false
    });
  },

  onProjectNameInput: function (e) {
    this.setData({
      newProjectName: e.detail.value
    });
  },

  onCategorySelect: function (e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      newProjectCategory: categoryId
    });
  },

  addProject: function () {
    const name = this.data.newProjectName.trim();
    if (!name) {
      wx.showToast({
        title: '请输入项目名称',
        icon: 'none'
      });
      return;
    }

    // 检查是否已经选择了宝贝
    if (!this.data.currentChild || !this.data.currentChild._id) {
      wx.showToast({
        title: '请先选择或添加宝贝',
        icon: 'none'
      });
      return;
    }

    const presetColors = ['#4A90E2', '#FF6B6B', '#52C41A', '#FAAD14', '#722ED1', '#EB2F96'];
    const randomColor = presetColors[Math.floor(Math.random() * presetColors.length)];
    store.addProject({
      name,
      category: this.data.newProjectCategory,
      color: randomColor,
      childId: this.data.currentChild._id,
      targetTime: 3600
    });

    wx.showToast({ title: '添加成功', icon: 'success' });
    this.hideAddDialog();
    this.loadProjects();
  },

  showTimeInput: function (e) {
    const projectId = e.currentTarget.dataset.id;
    const projectName = e.currentTarget.dataset.name;
    this.setData({
      showTimeDialog: true,
      selectedProjectId: projectId,
      selectedProjectName: projectName,
      inputHours: '',
      inputMinutes: ''
    });
  },

  hideTimeDialog: function () {
    this.setData({
      showTimeDialog: false
    });
  },

  onHoursInput: function (e) {
    this.setData({ inputHours: e.detail.value });
  },

  onMinutesInput: function (e) {
    this.setData({ inputMinutes: e.detail.value });
  },

  saveTimeRecord: function () {
    const hours = parseInt(this.data.inputHours) || 0;
    const minutes = parseInt(this.data.inputMinutes) || 0;
    
    if (hours === 0 && minutes === 0) {
      wx.showToast({ title: '请输入有效时长', icon: 'none' });
      return;
    }
    
    if (hours < 0 || minutes < 0 || minutes >= 60) {
      wx.showToast({ title: '时长格式不正确', icon: 'none' });
      return;
    }

    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (!this.data.currentChild || !this.data.currentChild._id) {
      wx.showToast({ title: '请先选择宝贝', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    store.addRecord({
      projectId: this.data.selectedProjectId,
      projectName: this.data.selectedProjectName,
      childId: this.data.currentChild._id,
      duration: totalSeconds
    });
    store.updateProjectTime(this.data.selectedProjectId, totalSeconds);
    wx.hideLoading();

    wx.showToast({ title: '记录成功', icon: 'success' });
    this.hideTimeDialog();
    this.loadProjects();
  },

  formatTime: function (seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  },

  getProgress: function (todayTime, targetTime) {
    if (targetTime === 0) return 0;
    return Math.min(Math.round((todayTime / targetTime) * 100), 100);
  }
});
