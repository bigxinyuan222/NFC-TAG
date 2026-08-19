export function formatClockTime(date = new Date()) {
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return hours + ':' + minutes
}

export function formatDateText(date = new Date()) {
	const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
	return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日  ' + weekMap[date.getDay()]
}
