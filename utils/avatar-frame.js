export const AVATAR_FRAMES = [
	{ id: 'default', name: '默认', className: '', overlay: '' },
	{ id: 'sunset', name: '暖阳', className: 'avatar-frame--sunset', overlay: '' },
	{ id: 'mint', name: '薄荷', className: 'avatar-frame--mint', overlay: '' },
	{ id: 'violet', name: '星梦', className: 'avatar-frame--violet', overlay: '' },
	{ id: 'gold', name: '鎏金', className: 'avatar-frame--gold', overlay: '' },
	{ id: 'catpaw', name: '猫爪', className: 'avatar-frame--catpaw avatar-shape--catpaw', overlay: '/static/frames/frame-catpaw.svg' },
	{ id: 'sky', name: '云端', className: 'avatar-frame--sky', overlay: '/static/frames/frame-sky.png', requiredDays: 3 },
	{ id: 'heartwing', name: '心翼', className: 'avatar-frame--heartwing', overlay: '/static/frames/frame-heartwing.png', requiredDays: 3 },
	{ id: 'nightrose', name: '夜玫', className: 'avatar-frame--nightrose', overlay: '/static/frames/frame-nightrose.png', requiredDays: 3 },
	{ id: 'bluebow', name: '蓝蝶', className: 'avatar-frame--bluebow', overlay: '/static/frames/frame-bluebow.png', requiredDays: 3 },
	{ id: 'bunnyred', name: '兔红', className: 'avatar-frame--bunnyred', overlay: '/static/frames/frame-bunnyred.png', handLeft: '/static/frames/frame-bunnyred-hand-l.png', handRight: '/static/frames/frame-bunnyred-hand-r.png', requiredDays: 5 },
	// 指定姓名才能用的头像框：列表里所有人可见，选择时校验姓名，不匹配弹窗拦截
	{ id: 'momtalk', name: '唠叨', className: 'avatar-frame--momtalk', overlay: '/static/frames/frame-momtalk.png', allowedUserNames: ['刘子怡'] },
	// 专属头像框：仅 allowedPrefixes 命中的用户可见
	{ id: 'king', name: '王者专属', className: 'avatar-frame--king', overlay: '/static/frames/hao.png', allowedPrefixes: ['200465'] },
	{ id: 'crown', name: '皇冠专属', className: 'avatar-frame--crown', overlay: '/static/frames/pei.png', allowedPrefixes: ['036058'] },
	{ id: 'demon', name: '恶魔专属', className: 'avatar-frame--demon', overlay: '/static/frames/qian.png', allowedPrefixes: ['025239'] }
]

const STORAGE_PREFIX = 'avatarFrame:'

function isValidFrameId(frameId) {
	return AVATAR_FRAMES.some((frame) => frame.id === frameId)
}

/**
 * 判断某个头像框对当前用户是否可见
 * 没有 allowedPrefixes 的框 = 全员可见
 * 有 allowedPrefixes 的框 = 只有 prefix 在列表里的用户可见
 */
function isFrameVisible(frame, session) {
	if (!frame || !frame.allowedPrefixes || !frame.allowedPrefixes.length) {
		return true
	}
	const prefix = session && session.dingtalkUserIdPrefix ? String(session.dingtalkUserIdPrefix) : ''
	return !!prefix && frame.allowedPrefixes.indexOf(prefix) !== -1
}

/**
 * 获取当前用户可见的头像框列表（用于选择面板渲染）
 */
export function getAvailableFrames(session) {
	return AVATAR_FRAMES.filter((frame) => isFrameVisible(frame, session))
}

/**
 * 指定姓名的头像框：当前用户姓名不在 allowedUserNames 内则不可用
 * 这类框在列表里对所有人可见，只是选择时会弹窗拦截
 */
export function isFrameOwnerDenied(frame, session) {
	if (!frame || !frame.allowedUserNames || !frame.allowedUserNames.length) {
		return false
	}
	const userName = session && session.userName ? String(session.userName).trim() : ''
	return frame.allowedUserNames.indexOf(userName) === -1
}

function getStorageKey(session) {
	const userName = session && session.userName ? session.userName : ''
	const department = session && session.department ? session.department : ''
	return STORAGE_PREFIX + userName + '::' + department
}

/**
 * 获取当前用户已选择的头像框 ID
 * 若已选的框对当前用户不再可见（被移出白名单）或姓名不匹配，降级为 default
 */
export function getAvatarFrameId(session) {
	const frameId = uni.getStorageSync(getStorageKey(session))
	const availableIds = getAvailableFrames(session).map((f) => f.id)
	if (availableIds.indexOf(frameId) !== -1) {
		const frame = AVATAR_FRAMES.find((f) => f.id === frameId)
		if (!isFrameOwnerDenied(frame, session)) {
			return frameId
		}
	}
	return 'default'
}

export function setAvatarFrameId(session, frameId) {
	const availableIds = getAvailableFrames(session).map((f) => f.id)
	const safeId = availableIds.indexOf(frameId) !== -1 ? frameId : 'default'
	uni.setStorageSync(getStorageKey(session), safeId)
}

export function getAvatarFrame(session) {
	const frameId = getAvatarFrameId(session)
	return AVATAR_FRAMES.find((frame) => frame.id === frameId) || AVATAR_FRAMES[0]
}
