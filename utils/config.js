export const BASE_URL = 'http://43.143.211.94:8080'

// 钉钉开放平台移动应用：Client ID（旧 AppKey）
export const DINGTALK_APP_KEY = 'dingap2ebzsizxigniub'
// 钉钉授权回调地址，需与钉钉后台「重定向 URL」一致；原生插件会拦截，不要求该地址真实可访问
export const DINGTALK_REDIRECT_URL = 'https://bigxinyuan222.github.io/urban-pancake/tz.html'

// 与 manifest.json 的 versionName 保持一致
export const APP_VERSION = '1.0.0'

// 部门可选列表：唯一数据源，注册页选择与各页展示共用
export const DEPARTMENT_OPTIONS = ['27鹰飞', '26鹰飞', '全栈二期']

// 后端返回的原始钉钉部门ID → 部门名称映射（登录拿到原始值时的前端翻译）
export const DEPARTMENT_ID_MAP = {
	'1035675564': '27鹰飞',
	'1089151080': '全栈二期',
	'1038350589': '26鹰飞'
}

export function isValidDepartment(name) {
	return DEPARTMENT_OPTIONS.indexOf(name) >= 0
}

// 将后端部门值规范化为名称：本身是名称则原样返回，是「钉钉部门:ID」格式则查映射表，查不到返回空
export function normalizeDepartment(value) {
	if (!value) return ''
	if (isValidDepartment(value)) return value
	const id = String(value).replace(/^钉钉部门[:：]*/, '').trim()
	return DEPARTMENT_ID_MAP[id] || ''
}

// 展示用：只在可选列表内的名称才直接展示，其余一律显示「未设置部门」，杜绝出现数字
export function getDisplayDepartment(value) {
	const name = normalizeDepartment(value)
	return isValidDepartment(name) ? name : '未设置部门'
}

// App端如实读取打包后 manifest.json 的 versionName，其余平台退回常量
export function getAppVersion() {
	// #ifdef APP-PLUS
	try {
		if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.version) {
			return plus.runtime.version
		}
	} catch (e) {}
	// #endif
	return APP_VERSION
}
