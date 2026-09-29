const STORAGE_KEY = 'appTheme'

export function getTheme() {
	const theme = uni.getStorageSync(STORAGE_KEY)
	return theme === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme) {
	uni.setStorageSync(STORAGE_KEY, theme === 'dark' ? 'dark' : 'light')
}
