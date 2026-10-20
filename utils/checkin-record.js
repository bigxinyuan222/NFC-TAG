import { formatClockTime } from './time'

const STORAGE_KEY = 'checkinRecords'

const CHECKIN_WINDOW_MINUTES = 20

export const CHECKIN_SLOTS = [
	{ slotId: 'slot-0800', time: '08:00', type: 'morning', pointId: 'point-001' },
	{ slotId: 'slot-0940', time: '09:40', type: 'evening', pointId: 'point-001' },
	{ slotId: 'slot-1010', time: '10:10', type: 'morning', pointId: 'point-001' },
	{ slotId: 'slot-1150', time: '11:50', type: 'evening', pointId: 'point-001' },
	{ slotId: 'slot-1430', time: '14:30', type: 'morning', pointId: 'point-001' },
	{ slotId: 'slot-1610', time: '16:10', type: 'evening', pointId: 'point-001' },
	{ slotId: 'slot-1640', time: '16:40', type: 'morning', pointId: 'point-001' },
	{ slotId: 'slot-1820', time: '18:20', type: 'evening', pointId: 'point-001' },
	{ slotId: 'slot-1930', time: '19:30', type: 'morning', pointId: 'point-001' },
	{ slotId: 'slot-2200', time: '22:00', type: 'evening', pointId: 'point-001' }
]

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

function getSlotTime(date, slot) {
	const value = new Date(date)
	const clock = slot.time.split(':').map(Number)
	return new Date(value.getFullYear(), value.getMonth(), value.getDate(), clock[0], clock[1]).getTime()
}

function getSlotWindow(slotDate, slot) {
	const scheduledTime = getSlotTime(slotDate, slot)
	return {
		start: scheduledTime - CHECKIN_WINDOW_MINUTES * 60 * 1000,
		end: scheduledTime
	}
}

export function getCurrentCheckinSlot(date = new Date(), slots = CHECKIN_SLOTS) {
	const time = new Date(date).getTime()
	return slots.find((slot) => {
		const window = getSlotWindow(date, slot)
		return time >= window.start && time <= window.end
	}) || null
}

export const CHECKIN_ADVANCE_MINUTES = 30

// 打卡时间窗：仅目标时间点前30分钟内可打，到点即止，其余时间一律拒绝
export function getCheckinWindowStatus(date = new Date(), slots = CHECKIN_SLOTS) {
	const time = new Date(date).getTime()
	const list = Array.isArray(slots) && slots.length ? slots : CHECKIN_SLOTS
	const active = list.find((slot) => {
		const scheduled = getSlotTime(date, slot)
		return time >= scheduled - CHECKIN_ADVANCE_MINUTES * 60 * 1000 && time <= scheduled
	}) || null
	return { allowed: !!active, slot: active }
}

// 重复打卡判断：当前打卡窗口（班次点前30分钟）内是否已有本地成功记录
// 注意：仅基于本机存储，换设备/清缓存后失效，彻底去重需后端判断
export function hasCheckedInCurrentWindow(session, date = new Date(), slots = CHECKIN_SLOTS) {
	const status = getCheckinWindowStatus(date, slots)
	if (!status.allowed || !status.slot) return false
	const scheduled = getSlotTime(date, status.slot)
	const start = scheduled - CHECKIN_ADVANCE_MINUTES * 60 * 1000
	return getUserCheckinRecords(session).some((record) => {
		return record.status === 'success'
			&& Number.isFinite(record.time)
			&& record.time >= start
			&& record.time <= scheduled
	})
}

function getSlotForRecordTime(date, slots = CHECKIN_SLOTS) {
	return getCurrentCheckinSlot(date, slots)
}

function isRecordMatched(record, dateKey, slot) {
	if (!record || record.status !== 'success' || record.dateKey !== dateKey || !Number.isFinite(record.time)) return false
	if (record.pointId && record.pointId !== slot.pointId) return false
	if (record.slotId) return record.slotId === slot.slotId
	const window = getSlotWindow(new Date(record.time), slot)
	const scheduledTime = getSlotTime(new Date(record.time), slot)
	return record.type === slot.type && record.time >= window.start && record.time <= scheduledTime
}

function sortByTimeDesc(records) {
	return records.sort((left, right) => right.time - left.time)
}

export function getUserCheckinRecords(session) {
	const { identityKey } = getIdentity(session)
	return sortByTimeDesc(getAllRecords()
		.filter((record) => record.identityKey === identityKey)
		.map((record) => {
			if (record.slotId || !Number.isFinite(record.time)) return record
			const slot = getSlotForRecordTime(new Date(record.time))
			return slot ? { ...record, slotId: slot.slotId, type: slot.type } : record
		}))
}

function parseRecordTime(value) {
	if (typeof value === 'number') {
		return new Date(value < 100000000000 ? value * 1000 : value)
	}
	if (typeof value === 'string' && value) {
		// "yyyy-MM-dd HH:mm:ss" 格式在 iOS 上无法被 new Date 解析，
		// 无时区标识时按本地时间手动解析；带时区的 ISO 字符串走原生解析
		const match = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(value)
		if (match) {
			return new Date(
				Number(match[1]), Number(match[2]) - 1, Number(match[3]),
				Number(match[4]), Number(match[5]), Number(match[6] || 0)
			)
		}
	}
	return new Date(value)
}

export function normalizeRemoteCheckinRecord(item, session) {
	const date = parseRecordTime(item && item.createdAt)
	const time = date.getTime()
	if (!Number.isFinite(time)) return null
	const userName = session && session.userName ? session.userName : ''
	const department = session && session.department ? session.department : ''
	const slot = getSlotForRecordTime(date)
	return {
		id: String(item.id),
		identityKey: userName + '::' + department,
		userName,
		department,
		time,
		dateKey: formatDateKey(date),
		displayDate: formatDisplayDate(date),
		weekText: getWeekText(date),
		displayTime: formatClockTime(date),
		slotId: slot ? slot.slotId : '',
		type: slot ? slot.type : '',
		status: 'success',
		pointId: item.pointId || '',
		message: '',
		source: 'remote'
	}
}

export function normalizeRemoteCheckinRecords(items, session) {
	const recordMap = {}
	;(Array.isArray(items) ? items : []).forEach((item) => {
		if (!item || item.id === undefined || item.id === null) return
		const record = normalizeRemoteCheckinRecord(item, session)
		if (record) recordMap[record.id] = record
	})
	return sortByTimeDesc(Object.keys(recordMap).map((key) => recordMap[key]))
}

export function matchCheckinSlots(records, dateKey, slots) {
	return slots.map((slot) => {
		let match = null
		let closest = Infinity
		;(Array.isArray(records) ? records : []).forEach((record) => {
			if (!isRecordMatched(record, dateKey, slot)) return
			const difference = Math.abs(record.time - getSlotTime(new Date(record.time), slot))
			if (difference < closest || (difference === closest && (record.time < match.time || (record.time === match.time && String(record.id) < String(match.id))))) {
				match = record
				closest = difference
			}
		})
		return match
	})
}

export function isCheckinSlotMatched(records, date, slot) {
	const dateKey = formatDateKey(date)
	return (Array.isArray(records) ? records : []).some((record) => isRecordMatched(record, dateKey, slot))
}

function getScheduledTimeForRecord(record) {
	const slot = CHECKIN_SLOTS.find((item) => item.slotId === record.slotId)
	return slot ? getSlotTime(new Date(record.time), slot) : null
}

function buildMonthlyCheckinStats(records, date = new Date(), options = {}) {
	const year = date.getFullYear()
	const month = date.getMonth()
	const monthPrefix = year + '-' + String(month + 1).padStart(2, '0') + '-'
	const todayKey = formatDateKey(new Date())
	const dayMap = {}
	;(Array.isArray(records) ? records : [])
		.filter((record) => record.status === 'success' && record.dateKey.indexOf(monthPrefix) === 0)
		.forEach((record) => {
			if (!dayMap[record.dateKey]) dayMap[record.dateKey] = { morning: false, evening: false }
			if (record.type === 'morning') dayMap[record.dateKey].morning = true
			if (record.type === 'evening') dayMap[record.dateKey].evening = true
		})

	let attendDays = 0
	let lateCount = 0
	let earlyLeaveCount = 0
	let missCount = 0
	;(Array.isArray(records) ? records : [])
		.filter((record) => record.status === 'success' && record.dateKey.indexOf(monthPrefix) === 0)
		.forEach((record) => {
			const scheduledTime = getScheduledTimeForRecord(record)
			if (!scheduledTime) return
			if (record.type === 'morning' && record.time > scheduledTime) lateCount++
			if (record.type === 'evening' && record.time < scheduledTime) earlyLeaveCount++
		})
	Object.keys(dayMap).forEach((key) => {
		const slot = dayMap[key]
		if (!slot.morning && !slot.evening) return
		attendDays++
		if (options.canCalculateMissing && key < todayKey && ((slot.morning && !slot.evening) || (!slot.morning && slot.evening))) missCount++
	})

	return { attendDays, lateCount, earlyLeaveCount, missCount, monthText: (month + 1) + '月' }
}

export function getMonthlyCheckinStatsFromRecords(records, date = new Date(), options = {}) {
	return buildMonthlyCheckinStats(records, date, options)
}

export function saveCheckinRecord(session, payload) {
	const { userName, department, identityKey } = getIdentity(session)
	const date = new Date(payload.time || Date.now())
	const time = date.getTime()
	const dateKey = formatDateKey(date)
	const sameDayRecords = getUserCheckinRecords(session)
		.filter((record) => record.dateKey === dateKey)
		.sort((left, right) => left.time - right.time)
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
		slotId: payload.slotId || '',
		type: payload.type || '',
		status: 'success',
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
		latestSuccessTime: successRecords[0] ? successRecords[0].displayTime : '',
		latestTime: todayRecords[0] ? todayRecords[0].displayTime : '',
		total: todayRecords.length
	}
}

export function getMonthlyCheckinStats(session, date = new Date()) {
	return buildMonthlyCheckinStats(getUserCheckinRecords(session), date, { canCalculateMissing: true })
}
