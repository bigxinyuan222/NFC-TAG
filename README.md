# NFC-TAG

基于 uni-app 的智能考勤打卡应用，支持用户登录、打卡、考勤记录查询和个人设置。

## 技术栈

- uni-app / Vue
- `uni.request` 调用后端接口
- `uni` 本地存储缓存会话和本地打卡记录
- HBuilderX 开发与运行

## 目录结构

```text
pages/       页面
components/  公共组件
api/         接口封装
utils/       会话、时间和打卡业务逻辑
static/      图片和图标资源
```

## 主要功能

- 用户注册和登录
- NFC / 设备打卡流程
- 今日打卡状态展示
- 打卡记录和月度考勤统计
- 个人资料、系统设置和帮助页面
