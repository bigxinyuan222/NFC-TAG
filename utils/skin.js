const STORAGE_KEY = 'appSkin'

// 配色皮肤：只切换背景渐变、文字色与强调色，不改变明暗反差，保证猫咪素材不违和
export const SKINS = [
	{ id: 'sunny', name: '暖阳', className: 'skin-sunny', dot: '#F59A23' },
	{ id: 'mint', name: '薄荷', className: 'skin-mint', dot: '#5FA97A' },
	{ id: 'dream', name: '星梦', className: 'skin-dream', dot: '#B07CD4' },
	{ id: 'sea', name: '海盐', className: 'skin-sea', dot: '#6B8FD8' }
]

export const DEFAULT_SKIN_ID = 'sunny'

export function getSkinId() {
	const id = uni.getStorageSync(STORAGE_KEY)
	return SKINS.some((skin) => skin.id === id) ? id : DEFAULT_SKIN_ID
}

export function saveSkinId(id) {
	if (!SKINS.some((skin) => skin.id === id)) return
	uni.setStorageSync(STORAGE_KEY, id)
}

export function getSkin() {
	return SKINS.find((skin) => skin.id === getSkinId()) || SKINS[0]
}

// 页面根节点使用，配合 App.vue 中的 .skin-* 变量覆盖
export function getSkinClass() {
	return getSkin().className
}

// 底部装饰波浪：暖阳沿用原始素材，其余皮肤使用按配色重新着色的副本
export function getSkinDecorSrc() {
	const skin = getSkin()
	return skin.id === DEFAULT_SKIN_ID
		? '/static/decor-bottom.svg'
		: '/static/decor/decor-bottom-' + skin.id + '.svg'
}
