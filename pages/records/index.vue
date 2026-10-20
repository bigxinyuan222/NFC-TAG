<template>
	<view class="wrap" :class="skinClass">
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
						<text class="stat-num">{{ monthStats.punchCount }}</text>
						<text class="stat-label">打卡(次)</text>
					</view>
				</view>
			</view>

			<text v-if="errorMessage" class="source-message">{{ errorMessage }}</text>

			<view class="schedule-card">
				<view class="schedule-head">
					<text class="schedule-title">打卡记录</text>
					<text class="schedule-date">{{ selectedDateText }}</text>
				</view>
				<view v-if="dayRecords.length === 0" class="record-empty">
					<image v-if="!isLoading" class="record-empty-cat" src="/static/cat-empty.png" mode="aspectFit" />
					<text class="record-empty-text">{{ isLoading ? '记录加载中…' : '这一天还没有打卡记录哦，喵' }}</text>
				</view>
				<view v-for="record in dayRecords" :key="record.id" class="schedule-row">
					<view class="schedule-left">
						<image class="schedule-icon" src="/static/icons/check-circle.svg" mode="aspectFit" />
						<text class="schedule-name">{{ record.displayTime }}</text>
					</view>
					<text class="schedule-status schedule-checked">已打卡</text>
				</view>
			</view>
		</scroll-view>

		<image class="bottom-decor" :src="decorSrc" mode="widthFix" />

		<app-tabbar current="records" :skin="skinClass" />
	</view>
</template>

	<script>
	import AppTabbar from '@/components/app-tabbar/index.vue'
	import { getUserCheckinRecords, normalizeRemoteCheckinRecords } from '@/utils/checkin-record'
	import { getMyCheckins } from '@/api/checkin'
	import { clearSession, getSession } from '@/utils/session'
	import { getSkinClass, getSkinDecorSrc } from '@/utils/skin'

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
				selectedDateKey: '',
				selectedDateText: '',
				selectedWeekText: '',
				recordList: [],
				recordSource: '',
				remoteRecords: [],
				remotePage: 0,
				remotePageSize: 100,
				remoteHasMore: true,
				remoteComplete: false,
				isLoading: false,
				isRefreshing: false,
				requestVersion: 0,
				errorMessage: '',
				skinClass: 'skin-sunny',
				decorSrc: '/static/decor-bottom.svg'
			}
		},
		computed: {
			dayRecords() {
				return (this.recordList || [])
					.filter((record) => record.status === 'success' && record.dateKey === this.selectedDateKey)
					.sort((left, right) => right.time - left.time)
			},
			monthStats() {
				const monthPrefix = this.selectedDateKey ? this.selectedDateKey.slice(0, 7) + '-' : ''
				const records = (this.recordList || []).filter((record) => (
					record.status === 'success' && monthPrefix && record.dateKey && record.dateKey.indexOf(monthPrefix) === 0
				))
				const dayMap = {}
				records.forEach((record) => { dayMap[record.dateKey] = true })
				return {
					attendDays: Object.keys(dayMap).length,
					punchCount: records.length,
					monthText: monthPrefix ? Number(this.selectedDateKey.slice(5, 7)) + '月' : ''
				}
			}
		},
		onShow() {
			this.skinClass = getSkinClass()
			this.decorSrc = getSkinDecorSrc()
			const { userName, department } = getSession()
			this.userName = userName
			this.department = department

			if (!this.userName || !this.department) {
				this.requestVersion++
				clearSession()
				this.goLogin()
				return
			}

			this.loadRecords()
		},
		methods: {
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
		background: var(--sk-page-bg);
	}

	.wrap {
		position: relative;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		background: linear-gradient(180deg, var(--sk-bg-1) 0%, var(--sk-bg-2) 60%, var(--sk-bg-3) 100%);
	}

	.bottom-decor {
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(108rpx + env(safe-area-inset-bottom));
		width: 100%;
		z-index: 0;
		pointer-events: none;
	}

	.scroll {
		position: relative;
		z-index: 1;
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
		color: var(--sk-text);
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
		border: 1rpx solid var(--sk-border);
		box-shadow: 0 12rpx 30rpx var(--sk-shadow-sm);
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
		color: var(--sk-text);
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
		color: var(--sk-text);
		font-size: 48rpx;
		font-weight: 700;
		line-height: 1;
	}

	.stat-primary {
		color: var(--sk-accent);
	}

	.stat-label {
		color: var(--sk-text-muted);
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
		color: var(--sk-text-4);
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
		color: var(--sk-text);
		font-size: 27rpx;
		font-weight: 700;
	}

	.schedule-date {
		color: var(--sk-text-muted);
		font-size: 21rpx;
	}

	.schedule-row {
		min-height: 106rpx;
		border-top: 1rpx solid var(--sk-line);
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

	.schedule-name {
		color: var(--sk-text);
		font-size: 26rpx;
		font-weight: 600;
	}

	.schedule-status {
		color: var(--sk-text-muted);
		font-size: 23rpx;
	}

	.schedule-checked {
		color: var(--sk-accent);
		font-weight: 600;
	}

	.record-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 28rpx 0 34rpx;
		gap: 14rpx;
	}

	.record-empty-cat {
		width: 240rpx;
		height: 158rpx;
	}

	.record-empty-text {
		color: var(--sk-text-muted);
		font-size: 23rpx;
	}

	.source-message {
		display: block;
		width: 640rpx;
		max-width: 100%;
		margin: 12rpx auto 0;
		color: var(--sk-text-muted);
		font-size: 22rpx;
		text-align: center;
	}

</style>
