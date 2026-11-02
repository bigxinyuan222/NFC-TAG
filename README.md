# 喵呜打卡：NFC 碰一碰 + 钉钉考勤

一套面向企业内部考勤场景的完整应用，由一个 uni-app 安卓 APP 和一个 Go 后端组成。员工用手机碰一下贴在签到点的 NFC 卡片，APP 读取卡片出厂序列号完成打卡，本地记录落库，同时后台异步把打卡流水同步到钉钉考勤。在此基础上还实现了钉钉一键登录、考勤记录查询、多组织凭证隔离等功能。

整个过程中最有价值的不是功能本身，而是 NFC 读卡、钉钉登录、原生插件、权限与签名这几个环节踩过的坑，本文把这些问题和解决思路完整记录下来。

## 整体架构

```text
┌─────────────────────────────┐         ┌──────────────────────────────┐
│        安卓 APP（前端）        │         │         后端服务（Go）          │
│  uni-app + Vue3 + HBuilderX  │         │  net/http + MySQL + JWT      │
│                             │         │                              │
│  NFC 读卡 / 钉钉登录 / 打卡页  │  HTTP   │  登录注册 / 签到 / 记录查询     │
│  记录页 / 个人中心 / 设置      │ ──────> │  钉钉 worker / 通讯录同步      │
└──────────────┬──────────────┘         └──────────────┬───────────────┘
               │ 碰一碰                                  │ 异步队列
               v                                         v
        ┌─────────────┐                         ┌─────────────────┐
        │  NFC 实体卡片 │                         │ 钉钉开放平台 API  │
        └─────────────┘                         └─────────────────┘
```

- 前端只负责交互和采集，所有业务校验、用户匹配、数据持久化都在后端。
- 后端与钉钉之间通过异步队列解耦，打卡接口不等待钉钉返回，避免外部接口拖慢主流程。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端框架 | uni-app、Vue3 |
| 前端能力 | plus.android 原生桥接、UTS 插件、uni 本地存储 |
| 开发/打包 | HBuilderX、云打包、自定义调试基座 |
| 后端 | Go 1.21，标准库 net/http（不使用 Web 框架） |
| 数据库 | MySQL 8.0，utf8mb4 |
| 鉴权 | JWT（HS256，72 小时）、PBKDF2 口令哈希 |
| 部署 | Docker Compose、云服务器、内嵌 OpenAPI |

## 目录结构

```text
pages/       页面
components/  公共组件
api/         接口封装
utils/       会话、时间和打卡业务逻辑
static/      图片和图标资源
```

## 核心功能

- 账号注册登录，口令 PBKDF2 哈希存储，登录下发 JWT。
- NFC 碰一碰读取卡片 UID，卡号白名单 + 签到点校验后写入打卡记录。
- 钉钉一键登录，授权后自动匹配系统用户。
- 打卡记录分页查询、月度考勤统计。
- 本地打卡流水异步同步钉钉考勤，失败指数退避重试。
- 多组织（乐知教育、乐知数字）凭证隔离，各自独立匹配用户。
- 今日打卡状态展示、个人资料编辑、系统设置与关于页面。

## 难点一：NFC 碰一碰读取卡片出厂 UID

### 先分清两种碰卡场景

1. **碰卡启动 APP**：APP 没在前台，系统识别到 NFC 后，根据 manifest 里的 intent-filter 把 APP 拉起来，卡片数据通过启动 intent 带进来。
2. **APP 在前台时碰卡**：APP 已经打开，需要通过前台调度（Foreground Dispatch）抢占 NFC 事件，监听 `newintent`。

如果只处理其中一种，就会出现「能碰卡打开 APP，但读不到 UID」或者「前台碰卡没反应」的问题。最终实现里两种场景都做了处理。

### 通过 plus.android 桥接拿到原生能力

uni-app 在 APP 端可以通过 `plus.android.importClass` 直接调用 Android 原生类，不需要写原生工程。获取 NFC 适配器的过程：

```javascript
const activity = plus.android.runtimeMainActivity()
const NfcAdapter = plus.android.importClass('android.nfc.NfcAdapter')
const adapter = NfcAdapter.getDefaultAdapter(activity)
if (!adapter) return { error: '当前设备不支持 NFC' }
if (!adapter.isEnabled()) return { error: '请先在系统设置中开启 NFC' }
```

这里依次区分了三种错误：设备没有 NFC 硬件、NFC 开关没打开、以及非 APP 平台，每一种都给出明确提示，而不是静默失败。

### 从 intent 中取出 Tag 并解析 UID

系统把卡片信息放在 intent 的 `EXTRA_TAG` 里，先判断 action 是否属于 NFC 三类事件之一，再取 Tag：

```javascript
const action = intent.getAction()
const isNfcIntent = action === NfcAdapter.ACTION_TAG_DISCOVERED
    || action === NfcAdapter.ACTION_TECH_DISCOVERED
    || action === NfcAdapter.ACTION_NDEF_DISCOVERED
if (!isNfcIntent) return null

const tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
const bytes = tag.getId()
```

`tag.getId()` 返回的是卡片出厂 UID 的**字节数组**，不是现成字符串，需要逐字节转成十六进制。完整转换过程：

```javascript
let uid = ''
for (let index = 0; index < bytes.length; index++) {
    uid += (Number(bytes[index]) & 0xff).toString(16).padStart(2, '0')
}
return uid.toUpperCase()
```

每一步的原理：

1. `Number(bytes[index])`：Java 的 byte 是有符号的，范围 -128 到 127，先转成数字。
2. `& 0xff`：把负数按无符号还原。例如字节值 -1（二进制补码 11111111）与 0xff 做按位与，得到 255，对应十六进制 `ff`。如果不做这一步，负数会被转成 `-1` 这样的错误字符串。
3. `toString(16)`：把 0 到 255 的整数转成十六进制。
4. `padStart(2, '0')`：小于 16 的值只有一位（如 5 转成 `5`），补前导零成 `05`，保证每个字节固定占两位。
5. 拼接后 `toUpperCase()`：得到统一大写的卡号，如 `5317C716430001`，与后端白名单口径一致。

### 前台调度与防重复

前台碰卡需要主动注册 `enableForegroundDispatch`，让系统优先把 NFC 事件交给当前页面：

```javascript
let flags = PendingIntent.FLAG_UPDATE_CURRENT
if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE
pendingIntent = PendingIntent.getActivity(activity, 0, intent, flags)
adapter.enableForegroundDispatch(activity, pendingIntent, null, null)
plus.globalEvent.addEventListener('newintent', handleNewIntent)
```

注意 Android 12（API 31）及以上强制要求 PendingIntent 显式声明可变性，必须加上 `FLAG_MUTABLE`，否则在新系统上会直接抛异常。

另外手机贴卡时往往会连续触发多次 intent，做了两层防护：

- 1 秒内相同 UID 的扫描结果去重（防抖）。
- 提交打卡时加 30 秒超时的全局锁，防止同一次碰卡产生重复打卡。

读完一次后用一个空 Intent 调 `setIntent` 清掉当前 intent，避免同一张卡被重复解析。

## 难点二：钉钉第三方登录的三次方案迭代

这是整个项目迭代次数最多的部分，前后试了三种方案。

### 方案一：plus.share 内置 SDK —— 不可行

最初以为 HBuilderX 内置的 OAuth/Share 模块能直接调钉钉。在 manifest 的「安卓模块配置」里实际确认：

- OAuth 模块只有一键登录、苹果、微信、QQ、微博、Google、Facebook。
- Share 模块只有微信、QQ、微博。

两处都没有钉钉。HBuilderX 官方内置能力不支持钉钉授权，这条路走不通，必须引入插件。

### 方案二：付费原生插件 WHY-Login —— 放弃

DCloud 插件市场的 WHY-Login 是付费原生插件，云打包授权 35 元，用 `uni.requireNativePlugin` 调用。关键限制在于：

- 付费原生插件只能在自定义调试基座里试用。
- 试用基座无法脱离 HBuilder 独立安装，每次启动还会弹测试提示。
- 正式发布必须购买授权。

评估后放弃该方案，并用 git 精准回退了这一版的全部改动。

### 方案三：免费 UTS 插件 open-dinglogin —— 最终方案

DCloud 插件市场 id=28077 的 open-dinglogin 是免费开源的 UTS 插件，以 `uni_modules` 目录形式存在，导入后 HBuilderX 自动识别，没有购买环节。

调用方式：

```javascript
import { authLogin } from '@/uni_modules/open-dinglogin'

const auth = await authLogin({
    appId: DINGTALK_APP_KEY,
    redirectUrl: DINGTALK_REDIRECT_URL,
    responseType: 'code',
    scope: 'openid',
    prompt: 'consent',
    state: Date.now() + ''
})
```

它的工作原理：插件内部包含一个原生回调 Activity（DDAuthActivity），点击登录后唤起钉钉，用户授权完成时由这个原生 Activity 拦截结果，再通过 Promise 直接把 authCode 返回给 JS。因此不需要再做一个网页中转页去接回调，`redirectUrl` 只需要在钉钉后台登记、与参数一致即可，不要求该地址真实可访问。

### 为什么 UTS 插件必须制作自定义基座

标准基座是 DCloud 预编译好的通用运行环境，里面不包含任何第三方插件的原生代码。UTS 插件在安卓端带有 Kotlin 原生代码，必须重新编译一个包含这些代码的运行环境，也就是「自定义调试基座」，真机调试时选择这个基座才能唤起钉钉。

需要区分清楚：

- 调试阶段：制作自定义基座，在基座里运行。
- 正式发布：直接云打包，`uni_modules` 里的插件会自动编译进 APK，不需要额外勾选或付费。

## 难点三：authCode 到企业 userid 的完整链路

钉钉授权拿到的 authCode 只是一个临时授权码，后端需要三步才能换成系统可识别的企业 userid。

### 第一步：authCode 换用户访问令牌

```text
POST https://api.dingtalk.com/v1.0/oauth2/userAccessToken
body: { clientId, clientSecret, code, grantType: "authorization_code" }
返回: { accessToken, refreshToken, expiresIn }
```

### 第二步：用户令牌换 unionId

```text
GET  https://api.dingtalk.com/v1.0/contact/users/me
header: x-acs-dingtalk-access-token: <用户访问令牌>
返回: { nick, openId, unionId, mobile, email }
```

unionId 是用户在当前应用下的唯一标识。

### 第三步：unionId 换企业 userid

```text
POST https://oapi.dingtalk.com/topapi/user/getbyunionid?access_token=<企业访问令牌>
body: { unionid }
返回: { result: { userid } }
```

这一步用的是企业内部应用的访问令牌，拿到的 userid 才是钉钉考勤、通讯录接口统一使用的标识。最后用这个 userid 匹配本地 `user.dingtalk_userid` 字段，匹配成功后签发与账号密码登录完全一致的 JWT，前端无需区分登录方式。

## 难点四：钉钉权限点

真机第一次跑通时，前两步都成功，第三步报错：

```text
getbyunionid failed (88) subcode=60011
应用尚未开通所需的权限: [qyapi_get_member]
```

钉钉应用默认只开了身份验证和消息通知权限，通讯录类接口需要手动添加对应权限点。项目里涉及的几个权限点：

| 权限点 | 作用 |
| --- | --- |
| qyapi_get_member | 成员详情读取，getbyunionid 换 userid 需要 |
| qyapi_get_member_by_mobile | 按手机号查询单个用户 userid |
| qyapi_get_department_member | 读取通讯录全体成员 |
| qyapi_get_department_list | 读取部门列表 |

开通路径：钉钉开放平台 → 应用详情 → 权限管理 → 搜索权限点 code → 立即开通。开通后无需改代码、无需重新打包，直接重试登录即可。如果开通前后端启动时的通讯录同步已经失败，重启一次后端，重新同步即可。

## 难点五：签名与证书

钉钉后台的安卓配置需要填包名和签名，这两个值必须和实际打包证书严格一致。

- 包名：`uni.app.UNI35FA817`。
- 签名：填证书的 MD5 指纹，通过 keytool 从打包证书导出。

关键约束：以后每次更新打包都必须选择**同一个证书**，签名指纹才不会变，钉钉后台也不用动。一旦更换证书，钉钉后台的安卓签名就要重新填写新证书的 MD5。

每次更新还要把 `versionCode` 递增，否则安卓系统不允许同版本号覆盖安装。自有证书文件和密码务必备份，证书丢失后无法再给该应用发布升级包。

## 后端设计要点

### 纯标准库，不引入 Web 框架

后端 HTTP 部分只用 Go 标准库 `net/http` 配合 `database/sql`，通过 `http.HandleFunc` 注册路由，依赖少、编译产物单一、部署简单。

### 异步队列 + worker 解耦钉钉同步

本地打卡成功后不直接调钉钉，而是写入 `dingtalk_upload` 队列表，后台 worker 每 5 秒轮询处理：

- 外部接口故障不会影响打卡主流程。
- 失败任务按指数退避独立重试，成功后回写钉钉 request_id。

### 数据库迁移与接口规范

- 用 `migrations/` 目录按编号管理增量 SQL，老库按顺序补跑，不破坏现有数据。
- 通过 `go:embed` 把 OpenAPI 规范内嵌进二进制，启动后访问 `/openapi.json` 即可拿到完整接口文档。
- 单元测试覆盖登录、注册、签到和钉钉客户端，钉钉部分用 mock 上传器，不依赖真实环境。

## 部署

- 测试环境使用 Docker Compose 一键拉起 MySQL 和后端，首次启动自动执行建表脚本。
- 凭证通过环境变量或本地 `dingtalk.local.env` 注入，该文件被 gitignore 忽略，不进入版本库。
- 前端 HBuilderX 云打包生成 APK，后端编译为单个可执行文件，整体部署链路较轻。

## 收获总结

1. **NFC 读卡要同时覆盖「碰卡启动」和「前台碰卡」两个场景**；卡片 UID 是字节数组，需要按「有符号 byte 还原、转十六进制、补前导零、统一大写」的流程解析，前台调度在 Android 12 以上还要处理 PendingIntent 可变性标志。
2. **uni-app 接钉钉登录没有内置能力**，付费插件和免费 UTS 插件的核心差别在于授权成本；最终用免费开源的 open-dinglogin 解决，带原生代码的 UTS 插件调试必须制作自定义基座，正式云打包则自动包含。
3. **钉钉服务端链路是 authCode → 用户访问令牌 → unionId → 企业 userid 三步**，每一步对应不同接口和字段命名规则；通讯录类接口要单独开通权限点，否则会在最后一步被拒绝。
4. **签名证书是安卓应用的长期身份**，包名、签名、证书三者必须保持一致，更新时 versionCode 递增、证书不变，才能稳定覆盖安装并保留钉钉登录能力。
5. **后端用异步队列隔离外部依赖、用 state 路由多组织凭证、用编号迁移和内嵌 OpenAPI 管理演进**，这些设计让系统在对接钉钉这类外部平台时更可控、更容易排查问题。
