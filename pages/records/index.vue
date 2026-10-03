<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<scroll-view class="scroll" scroll-y :refresher-enabled="true" :refresher-triggered="isRefreshing" @refresherrefresh="handleRefresh">
			<view class="header-row">
				<text class="page-title">打卡记录</text>
				<image class="header-icon" src="/static/icons/clipboard.svg" mode="aspectFit" />
			</view>

			<view class="date-bar">
				<image class="date-arrow-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" @tap="shiftDate(-1)" />
				<picker class="date-picker-shell" mode="date" :value="selectedDateKey" @change="handleDateChange">
					<view class="date-center date-picker-trigger">
						<image class="date-icon" src="/static/icons/calendar.svg" mode="aspectFit" />
						<text class="date-text">{{ selectedDateText }} {{ selectedWeekText }}</text>
					</view>
				</picker>
				<image class="date-arrow-icon" src="/static/icons/chevron-right.svg" mode="aspectFit" @tap="shiftDate(1)" />
			</view>

			<view class="stats-card">
				<view class="stats-head">
					<text class="stats-title">{{ monthStats.monthText }}考勤统计{{ recordSource === 'remote' && !remoteComplete ? (isLoading ? ' · 加载中' : ' · 数据未全') : '' }}</text>
				</view>
				<view class="stats-grid">
					<view class="stat-cell">
						<text class="stat-num stat-primary">{{ monthStats.attendDays }}</text>
						<text class="stat-label">出勤(天)</text>
					</view>
					<view class="stat-cell">
						<text class="stat-num" :class="{ 'stat-warn': monthStats.lateCount > 0 }">{{ monthStats.lateCount }}</text>
						<text class="stat-label">迟到(次)</text>
					</view>
					<view class="stat-cell">
						<text class="stat-num" :class="{ 'stat-warn': monthStats.earlyLeaveCount > 0 }">{{ monthStats.earlyLeaveCount }}</text>
						<text class="stat-label">早退(次)</text>
					</view>
					<view class="stat-cell">
						<text class="stat-num" :class="{ 'stat-warn': monthStats.missCount > 0 }">{{ monthStats.missCount }}</text>
						<text class="stat-label">缺卡(次)</text>
					</view>
				</view>
			</view>

			<text v-if="errorMessage" class="source-message">{{ errorMessage }}</text>

			<view class="schedule-card">
				<view class="schedule-head">
					<text class="schedule-title">打卡记录</text>
					<text class="schedule-date">{{ selectedDateText }}</text>
				</view>
				<view v-for="(slot, index) in checkinSlots" :key="slot.time" class="schedule-row" :class="{ 'schedule-pair-start': index > 0 && index % 2 === 0 }">
					<view class="schedule-left">
						<image class="schedule-icon" :src="slot.type === 'morning' ? '/static/icons/check-circle.svg' : '/static/icons/clock.svg'" mode="aspectFit" />
						<view class="schedule-info">
							<text class="schedule-name">{{ slot.type === 'morning' ? '上班打卡' : '下班打卡' }}</text>
							<text class="schedule-time">{{ slot.time }}</text>
						</view>
					</view>
					<view class="schedule-result">
						<text class="schedule-status" :class="{ 'schedule-checked': slotMatches[index], 'schedule-late': isSlotLate(index) }">{{ getSlotStatus(index) }}</text>
						<text v-if="slotMatches[index]" class="schedule-actual-time">{{ slotMatches[index].displayTime }}</text>
					</view>
				</view>
			</view>
		</scroll-view>

		<app-tabbar current="records" :theme="currentTheme" />
	</view>
</template>

	<script>
	import AppTabbar from '@/components/app-tabbar/index.vue'
	import { CHECKIN_SLOTS, getMonthlyCheckinStats, getMonthlyCheckinStatsFromRecords, getUserCheckinRecords, matchCheckinSlots, normalizeRemoteCheckinRecords } from '@/utils/checkin-record'
	import { getMyCheckins } from '@/utils/checkin-api'
	import { clearSession, getSession } from '@/utils/session'
	import { getTheme } from '@/utils/theme'

	function formatDateKey(date) {
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		return year + '-' + month + '-' + day
	}

	function parseDateKey(dateKey) {
		const parts = dateKey.split('-')
		return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
	}

	function getWeekText(date) {
		const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
		return weekMap[date.getDay()]
	}

	function getDisplayDateText(date) {
		return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日'
	}

	export default {
		components: {
			AppTabbar
		},
		data() {
			return {
				userName: '',
				department: '',
				currentTheme: 'light',
				selectedDateKey: '',
				selectedDateText: '',
				selectedWeekText: '',
				checkinSlots: CHECKIN_SLOTS,
				slotMatches: [],
				monthStats: {
					attendDays: 0,
					lateCount: 0,
					earlyLeaveCount: 0,
					missCount: 0,
					monthText: ''
				},
				recordList: [],
				recordSource: '',
				remoteRecords: [],
				remotePage: 0,
				remotePageSize: 100,
				remoteTotal: 0,
				remoteHasMore: true,
				remoteComplete: false,
				isLoading: false,
				isRefreshing: false,
				nowTime: Date.now(),
				requestVersion: 0,
				errorMessage: ''
			}
		},
		onShow() {
			this.nowTime = Date.now()
			clearInterval(this.statusTimer)
			this.statusTimer = setInterval(() => { this.nowTime = Date.now() }, 1000)
			const { userName, department } = getSession()
			this.userName = userName
			this.department = department
			this.currentTheme = getTheme()

			if (!this.userName || !this.department) {
				this.requestVersion++
				clearSession()
				this.goLogin()
				return
			}

			this.loadRecords()
		},
		onHide() {
			clearInterval(this.statusTimer)
		},
		onUnload() {
			clearInterval(this.statusTimer)
		},
		methods: {
			isSlotLate(index) {
				if (!this.selectedDateKey || this.checkinSlots[index].type !== 'morning' || this.slotMatches[index]) return false
				if (this.isLoading || (this.recordSource === 'remote' && !this.remoteComplete)) return false
				const parts = this.selectedDateKey.split('-').map(Number)
				const clock = this.checkinSlots[index].time.split(':').map(Number)
				return this.nowTime > new Date(parts[0], parts[1] - 1, parts[2], clock[0], clock[1]).getTime()
			},
			getSlotStatus(index) {
				if (this.slotMatches[index]) return '已打卡'
				if (this.isLoading || (this.recordSource === 'remote' && !this.remoteComplete)) return '待确认'
				return this.isSlotLate(index) ? '迟到' : '未打卡'
			},
			goLogin() {
				uni.reLaunch({
					url: '/pages/login/index'
				})
			},
			loadRecords(isRefresh = false) {
				const version = ++this.requestVersion
				if (!this.selectedDateKey) this.selectedDateKey = formatDateKey(new Date())
				this.remoteRecords = []
				this.remotePage = 0
				this.remoteTotal = 0
				this.remoteHasMore = true
				this.remoteComplete = false
				this.recordSource = 'remote'
				this.errorMessage = ''
				this.recordList = []
				this.isLoading = true
				this.isRefreshing = isRefresh
				this.refreshSelectedDate()
				this.loadAllPages(version)
			},
			async loadAllPages(version) {
				try {
					while (this.remoteHasMore) {
						const page = this.remotePage + 1
						const result = await getMyCheckins({ page, pageSize: this.remotePageSize })
						if (version !== this.requestVersion) return
						const records = normalizeRemoteCheckinRecords(result.items, {
							userName: this.userName,
							department: this.department
						})
						const recordMap = {}
						this.remoteRecords.forEach((item) => { recordMap[item.id] = item })
						records.forEach((item) => { recordMap[item.id] = item })
						this.remoteRecords = Object.keys(recordMap).map((key) => recordMap[key]).sort((left, right) => right.time - left.time)
						this.remotePage = page
						this.remoteTotal = result.total
						this.remoteHasMore = result.items.length > 0 && page * result.pageSize < result.total
						this.remoteComplete = !this.remoteHasMore && (result.total === 0 || page * result.pageSize >= result.total)
						this.recordList = this.remoteRecords
						this.errorMessage = this.remoteComplete || this.remoteHasMore ? '' : '部分记录未加载完整，请下拉刷新重试'
						this.refreshSelectedDate()
					}
				} catch (error) {
					if (version !== this.requestVersion) return
					if (error && error.isAuthError) {
						this.requestVersion++
						clearSession()
						this.goLogin()
						return
					}
					if (this.remotePage === 0) {
						this.recordSource = 'local'
						this.recordList = getUserCheckinRecords({ userName: this.userName, department: this.department })
						this.errorMessage = '网络不可用，当前显示本地记录'
					} else {
						this.errorMessage = '部分记录未加载完整，请下拉刷新重试'
					}
					this.refreshSelectedDate()
				} finally {
					if (version === this.requestVersion) {
						this.isLoading = false
						this.isRefreshing = false
					}
				}
			},
			handleRefresh() {
				if (this.isRefreshing) return
				this.loadRecords(true)
			},
			refreshSelectedDate() {
				const date = parseDateKey(this.selectedDateKey)
				this.selectedDateText = getDisplayDateText(date)
				this.selectedWeekText = getWeekText(date)
				this.slotMatches = matchCheckinSlots(this.recordList, this.selectedDateKey, this.checkinSlots)
				this.monthStats = this.recordSource === 'remote'
					? getMonthlyCheckinStatsFromRecords(this.recordList, date, { canCalculateMissing: false })
					: getMonthlyCheckinStats({ userName: this.userName, department: this.department }, date)
			},
			handleDateChange(event) {
				this.selectedDateKey = event.detail.value
				this.refreshSelectedDate()
			},
			shiftDate(step) {
				const date = parseDateKey(this.selectedDateKey)
				date.setDate(date.getDate() + step)
				this.selectedDateKey = formatDateKey(date)
				this.refreshSelectedDate()
			}
		}
	}
</script>

<style>
	page {
		background: #eef4ff;
	}

	.wrap {
		height: 100vh;
		height: 100dvh;
		background: linear-gradient(180deg, #eef4ff 0%, #f8fbff 68%, #eef4ff 100%);
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .page-title,
	.theme-dark .stats-title,
	.theme-dark .stat-num,
	.theme-dark .schedule-title,
	.theme-dark .schedule-name {
		color: #f3f4f6;
	}

	.theme-dark .stat-primary {
		color: #7ea3ff;
	}

	.theme-dark .stat-warn {
		color: #e8a45c;
	}

	.theme-dark .date-text,
	.theme-dark .stat-label,
	.theme-dark .schedule-date,
	.theme-dark .schedule-time,
	.theme-dark .schedule-status {
		color: #9ca3af;
	}

	.theme-dark .source-message,
	.theme-dark .load-message {
		color: #9ca3af;
	}

	.theme-dark .date-bar,
	.theme-dark .stats-card,
	.theme-dark .schedule-card {
		background: rgba(24, 27, 33, 0.96);
		box-shadow: none;
	}

	.theme-dark .schedule-row {
		border-color: #30343b;
	}

	.theme-dark .schedule-checked {
		color: #7ea3ff;
	}

	.theme-dark .schedule-late {
		color: #e8a45c;
	}

	.scroll {
		height: 100%;
		box-sizing: border-box;
		padding: 156rpx 30rpx 132rpx;
	}

	.header-row,
	.date-bar,
	.date-center,
	.stats-head,
	.schedule-head,
	.schedule-row,
	.schedule-left {
		display: flex;
		align-items: center;
	}

	.header-row,
	.stats-head,
	.schedule-head,
	.schedule-row {
		justify-content: space-between;
	}

	.header-row {
		padding: 0 2rpx;
	}

	.page-title {
		color: #182033;
		font-size: 40rpx;
		font-weight: 700;
		line-height: 1.2;
	}

	.header-icon {
		width: 56rpx;
		height: 56rpx;
	}

	.date-bar,
	.stats-card,
	.schedule-card {
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 12rpx 30rpx rgba(45, 68, 128, 0.06);
	}

	.stats-card {
		width: 640rpx;
		max-width: 100%;
		margin: 30rpx auto 0;
		padding: 28rpx 28rpx 26rpx;
		box-sizing: border-box;
		border-radius: 28rpx;
	}

	.stats-title {
		color: #182033;
		font-size: 27rpx;
		font-weight: 700;
	}

	.stats-head {
		flex-wrap: wrap;
		gap: 8rpx;
	}

	.stats-grid {
		display: flex;
		margin-top: 28rpx;
	}

	.stat-cell {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12rpx;
	}

	.stat-num {
		color: #182033;
		font-size: 48rpx;
		font-weight: 700;
		line-height: 1;
	}

	.stat-primary {
		color: #2f6dff;
	}

	.stat-warn {
		color: #e08838;
	}

	.stat-label {
		color: #8b94a6;
		font-size: 21rpx;
	}

	.date-bar {
		width: 410rpx;
		height: 68rpx;
		margin: 42rpx auto 0;
		padding: 0 20rpx;
		border-radius: 34rpx;
		box-sizing: border-box;
	}

	.date-arrow-icon {
		width: 32rpx;
		height: 32rpx;
		flex-shrink: 0;
	}

	.date-center {
		gap: 12rpx;
		min-width: 0;
	}

	.date-picker-shell {
		flex: 1;
		display: flex;
		justify-content: center;
	}

	.date-picker-trigger {
		height: 100%;
	}

	.date-icon {
		width: 32rpx;
		height: 32rpx;
	}

	.date-text {
		color: #666f82;
		font-size: 23rpx;
		font-weight: 600;
		white-space: nowrap;
	}

	.schedule-card {
		width: 640rpx;
		max-width: 100%;
		margin: 30rpx auto 0;
		padding: 8rpx 28rpx 12rpx;
		box-sizing: border-box;
		border-radius: 28rpx;
	}

	.schedule-head {
		min-height: 82rpx;
	}

	.schedule-title {
		color: #182033;
		font-size: 27rpx;
		font-weight: 700;
	}

	.schedule-date {
		color: #8b94a6;
		font-size: 21rpx;
	}

	.schedule-row {
		min-height: 106rpx;
		border-top: 1rpx solid #edf0f5;
	}

	.schedule-row.schedule-pair-start {
		border-top-style: dashed;
	}

	.schedule-left {
		gap: 16rpx;
		min-width: 0;
	}

	.schedule-icon {
		width: 42rpx;
		height: 42rpx;
		flex-shrink: 0;
	}

	.schedule-info {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}

	.schedule-name {
		color: #182033;
		font-size: 26rpx;
		font-weight: 600;
	}

	.schedule-time,
	.schedule-status,
	.schedule-actual-time {
		color: #8b94a6;
		font-size: 23rpx;
	}

	.schedule-result {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
		gap: 6rpx;
	}

	.schedule-checked {
		color: #2f6dff;
		font-weight: 600;
	}

	.schedule-late {
		color: #e08838;
		font-weight: 600;
	}

	.source-message {
		display: block;
		width: 640rpx;
		max-width: 100%;
		margin: 12rpx auto 0;
		color: #8a94a6;
		font-size: 22rpx;
		text-align: center;
	}

</style>
