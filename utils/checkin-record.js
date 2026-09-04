import { formatClockTime } from './time'

const STORAGE_KEY = 'checkinRecords'

function getIdentity(session) {
	const userName = session && session.userName ? session.userName : ''
	const department = session && session.department ? session.department : ''
	return {
		userName,
		department,
		identityKey: userName + '::' + department
	}
}

function getAllRecords() {
	const records = uni.getStorageSync(STORAGE_KEY)
	return Array.isArray(records) ? records : []
}

function saveAllRecords(records) {
	uni.setStorageSync(STORAGE_KEY, records)
}

function formatDateKey(date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return year + '-' + month + '-' + day
}

function formatDisplayDate(date) {
	return date.getMonth() + 1 + '月' + date.getDate() + '日'
}

function getWeekText(date) {
	const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
	return weekMap[date.getDay()]
}

function sortByTimeDesc(records) {
	return records.sort((left, right) => right.time - left.time)
}

export function getUserCheckinRecords(session) {
	const { identityKey } = getIdentity(session)
	return sortByTimeDesc(getAllRecords().filter((record) => record.identityKey === identityKey))
}

export function saveCheckinRecord(session, payload) {
	const { userName, department, identityKey } = getIdentity(session)
	const date = new Date(payload.time || Date.now())
	const time = date.getTime()
	const dateKey = formatDateKey(date)
	const sameDayRecords = getUserCheckinRecords(session)
		.filter((record) => record.dateKey === dateKey)
		.sort((left, right) => left.time - right.time)
	const type = sameDayRecords.length === 0 ? 'morning' : 'evening'
	const nextRecord = {
		id: String(time) + '-' + String(sameDayRecords.length + 1),
		identityKey,
		userName,
		department,
		time,
		dateKey,
		displayDate: formatDisplayDate(date),
		weekText: getWeekText(date),
		displayTime: formatClockTime(date),
		type,
		status: payload.success === false ? 'fail' : 'success',
		pointId: payload.pointId || '',
		message: payload.message || '',
		source: payload.source || 'mock'
	}
	const records = getAllRecords()
	records.push(nextRecord)
	saveAllRecords(sortByTimeDesc(records))
	return nextRecord
}

export function getTodayCheckinSummary(session) {
	const todayKey = formatDateKey(new Date())
	const todayRecords = getUserCheckinRecords(session).filter((record) => record.dateKey === todayKey)
	const morningRecord = todayRecords.find((record) => record.type === 'morning')
	const eveningRecord = todayRecords.find((record) => record.type === 'evening')
	const latestRecord = todayRecords[0] || null

	return {
		morningText: morningRecord ? morningRecord.displayTime : '未打卡',
		eveningText: eveningRecord ? eveningRecord.displayTime : '未打卡',
		morningChecked: !!morningRecord,
		eveningChecked: !!eveningRecord,
		latestTime: latestRecord ? latestRecord.displayTime : '',
		total: todayRecords.length
	}
}

export function clearUserCheckinRecords(session) {
	const { identityKey } = getIdentity(session)
	const records = getAllRecords().filter((record) => record.identityKey !== identityKey)
	saveAllRecords(records)
}
