const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')

const source = fs.readFileSync(path.join(__dirname, '../utils/checkin-record.js'), 'utf8')
	.replace(/^import .*$/gm, '')
	.replace(/^export /gm, '')
const { CHECKIN_SLOTS, getCheckinWindowStatus } = vm.runInNewContext(
	source + '\n({ CHECKIN_SLOTS, getCheckinWindowStatus })'
)

test('each check-in window opens 30 minutes before its scheduled time and closes immediately after it', () => {
	for (const slot of CHECKIN_SLOTS) {
		const [hour, minute] = slot.time.split(':').map(Number)
		const scheduled = new Date(2026, 10, 4, hour, minute).getTime()
		const start = scheduled - 30 * 60 * 1000
		// Isolate each slot: adjacent production windows can touch at their boundaries.
		const status = (time) => getCheckinWindowStatus(new Date(time), [slot])
		assert.equal(status(start - 1).allowed, false, slot.time + ': before start')
		assert.equal(status(start).allowed, true, slot.time + ': at start')
		assert.equal(status(scheduled).allowed, true, slot.time + ': at scheduled time')
		assert.equal(status(scheduled + 1).allowed, false, slot.time + ': after end')
		assert.equal(status(start).slot.slotId, slot.slotId)
	}
})

test('the actual schedule rejects unrestricted test times and accepts the next valid window', () => {
	for (const [hour, minute] of [[0, 0], [7, 29], [8, 1], [12, 0], [15, 21], [15, 39], [22, 1], [23, 59]]) {
		assert.equal(getCheckinWindowStatus(new Date(2026, 10, 4, hour, minute)).allowed, false, hour + ':' + minute)
	}
	assert.equal(getCheckinWindowStatus(new Date(2026, 10, 4, 7, 30)).allowed, true)
	assert.equal(getCheckinWindowStatus(new Date(2026, 10, 4, 15, 40)).slot.slotId, 'slot-1610')
})
