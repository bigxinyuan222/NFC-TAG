import { formatClockTime } from './time'

const STORAGE_KEY = 'checkinRecords'

// 上/下班打卡归属分界：12 点前打卡计入上班卡，12 点及以后计入下班卡
const MORNING_END_HOUR = 12

// 月度考勤统计参考：09:00 后打上班卡计迟到，18:00 前打下班卡计早退
const LATE_AFTER_HOUR = 9
const EARLY_LEAVE_BEFORE_HOUR = 18

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
	// 按打卡时刻判定归属，避免下午打的卡被记成"上班打卡"的不合理显示
	const type = date.getHours() < MORNING_END_HOUR ? 'morning' : 'evening'
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
	const now = new Date()
	const todayKey = formatDateKey(now)
	const todayRecords = getUserCheckinRecords(session).filter((record) => record.dateKey === todayKey)
	const successRecords = todayRecords.filter((record) => record.status === 'success')
	const morningRecords = successRecords.filter((record) => record.type === 'morning')
	const eveningRecords = successRecords.filter((record) => record.type === 'evening')
	// 上班卡取当天最早一次，下班卡取当天最晚一次
	const morningRecord = morningRecords.length
		? morningRecords.reduce((earliest, item) => (item.time < earliest.time ? item : earliest))
		: null
	const eveningRecord = eveningRecords.length
		? eveningRecords.reduce((latest, item) => (item.time > latest.time ? item : latest))
		: null

	return {
		morningChecked: !!morningRecord,
		eveningChecked: !!eveningRecord,
		morningTime: morningRecord ? morningRecord.displayTime : '',
		eveningTime: eveningRecord ? eveningRecord.displayTime : '',
		morningStatusText: morningRecord ? '已完成上班打卡' : '未打卡',
		eveningStatusText: eveningRecord ? '已完成下班打卡' : '未打卡',
		// 当前时间所处的打卡时段，用于驱动待打卡提示随时间变化
		isMorningPhase: now.getHours() < MORNING_END_HOUR,
		latestTime: todayRecords[0] ? todayRecords[0].displayTime : '',
		total: todayRecords.length
	}
}

export function getMonthlyCheckinStats(session, date = new Date()) {
	const year = date.getFullYear()
	const month = date.getMonth()
	const monthPrefix = year + '-' + String(month + 1).padStart(2, '0') + '-'
	const todayKey = formatDateKey(new Date())

	// 当月成功打卡记录按天分组：上班卡取最早一次，下班卡取最晚一次
	const dayMap = {}
	getUserCheckinRecords(session)
		.filter((record) => record.status === 'success' && record.dateKey.indexOf(monthPrefix) === 0)
		.forEach((record) => {
			if (!dayMap[record.dateKey]) {
				dayMap[record.dateKey] = { morning: null, evening: null }
			}
			const slot = dayMap[record.dateKey]
			if (record.type === 'morning') {
				if (!slot.morning || record.time < slot.morning.time) {
					slot.morning = record
				}
			} else {
				if (!slot.evening || record.time > slot.evening.time) {
					slot.evening = record
				}
			}
		})

	let attendDays = 0
	let lateCount = 0
	let earlyLeaveCount = 0
	let missCount = 0

	Object.keys(dayMap).forEach((key) => {
		const { morning, evening } = dayMap[key]
		if (!morning && !evening) {
			return
		}
		// 有任一成功打卡即计为出勤
		attendDays++
		if (morning) {
			const morningDate = new Date(morning.time)
			if (morningDate.getHours() * 60 + morningDate.getMinutes() > LATE_AFTER_HOUR * 60) {
				lateCount++
			}
		}
		if (evening) {
			const eveningDate = new Date(evening.time)
			if (eveningDate.getHours() * 60 + eveningDate.getMinutes() < EARLY_LEAVE_BEFORE_HOUR * 60) {
				earlyLeaveCount++
			}
		}
		// 缺卡：仅统计已过去的日期（当天状态未定，不参与）
		if (key < todayKey && ((morning && !evening) || (!morning && evening))) {
			missCount++
		}
	})

	return {
		attendDays,
		lateCount,
		earlyLeaveCount,
		missCount,
		monthText: (month + 1) + '月'
	}
}

export function clearUserCheckinRecords(session) {
	const { identityKey } = getIdentity(session)
	const records = getAllRecords().filter((record) => record.identityKey !== identityKey)
	saveAllRecords(records)
}
