export const AVATAR_FRAMES = [
	{ id: 'default', name: '默认', className: '', overlay: '' },
	{ id: 'sunset', name: '暖阳', className: 'avatar-frame--sunset', overlay: '' },
	{ id: 'mint', name: '薄荷', className: 'avatar-frame--mint', overlay: '' },
	{ id: 'violet', name: '星梦', className: 'avatar-frame--violet', overlay: '' },
	{ id: 'gold', name: '鎏金', className: 'avatar-frame--gold', overlay: '' },
	{ id: 'catpaw', name: '猫爪', className: 'avatar-frame--catpaw avatar-shape--catpaw', overlay: '/static/frames/frame-catpaw.svg' },
	{ id: 'sky', name: '云端', className: 'avatar-frame--sky', overlay: '/static/frames/frame-sky.png' },
	{ id: 'heartwing', name: '心翼', className: 'avatar-frame--heartwing', overlay: '/static/frames/frame-heartwing.png' },
	{ id: 'nightrose', name: '夜玫', className: 'avatar-frame--nightrose', overlay: '/static/frames/frame-nightrose.png' },
	{ id: 'bluebow', name: '蓝蝶', className: 'avatar-frame--bluebow', overlay: '/static/frames/frame-bluebow.png' },
	{ id: 'bunnyred', name: '兔红', className: 'avatar-frame--bunnyred', overlay: '/static/frames/frame-bunnyred.png', handLeft: '/static/frames/frame-bunnyred-hand-l.png', handRight: '/static/frames/frame-bunnyred-hand-r.png' }
]

const STORAGE_PREFIX = 'avatarFrame:'

function isValidFrameId(frameId) {
	return AVATAR_FRAMES.some((frame) => frame.id === frameId)
}

function getStorageKey(session) {
	const userName = session && session.userName ? session.userName : ''
	const department = session && session.department ? session.department : ''
	return STORAGE_PREFIX + userName + '::' + department
}

export function getAvatarFrameId(session) {
	const frameId = uni.getStorageSync(getStorageKey(session))
	return isValidFrameId(frameId) ? frameId : 'default'
}

export function setAvatarFrameId(session, frameId) {
	uni.setStorageSync(getStorageKey(session), isValidFrameId(frameId) ? frameId : 'default')
}

export function getAvatarFrame(session) {
	const frameId = getAvatarFrameId(session)
	return AVATAR_FRAMES.find((frame) => frame.id === frameId) || AVATAR_FRAMES[0]
}
