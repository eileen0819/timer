App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d4ghukp8f8a1c52d4',
        traceUser: true,
      });
      
      // 动态加载 Quicksand 字体以支持设计系统
      wx.loadFontFace({
        family: 'Quicksand',
        source: 'url("https://fonts.gstatic.com/s/quicksand/v31/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkP8o58m-wi40.woff2")',
        success: console.log,
        fail: console.error
      });
    }
  },
  globalData: {
    userInfo: null
  }
});