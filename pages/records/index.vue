<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<scroll-view class="scroll" scroll-y>
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

			<view class="summary-card">
				<view class="summary-col">
					<view class="summary-main-row">
						<image class="summary-icon" src="/static/icons/check-circle.svg" mode="aspectFit" />
						<view class="summary-copy">
							<text class="summary-label">上班打卡</text>
							<text class="summary-time">{{ morningText }}</text>
							<text class="summary-state active-state">{{ morningChecked ? '已打卡' : '--:--' }}</text>
						</view>
					</view>
				</view>

				<view class="summary-divider"></view>

				<view class="summary-col">
					<view class="summary-main-row">
						<image class="summary-icon" src="/static/icons/clock.svg" mode="aspectFit" />
						<view class="summary-copy">
							<text class="summary-label">下班打卡</text>
							<text class="summary-time" :class="{ 'muted-time': !eveningChecked }">{{ eveningText }}</text>
							<text class="summary-state muted-state">{{ eveningChecked ? eveningText : '--:--' }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="section-head">
				<text class="section-title">打卡记录</text>
				<text class="section-side">{{ dayRecordList.length }} 条记录</text>
			</view>

			<view class="list-card">
				<view v-if="dayRecordList.length === 0" class="empty-state">
					<text class="empty-text">当日暂无打卡记录</text>
				</view>
				<view v-for="item in dayRecordList" :key="item.id" class="record-item">
					<view class="record-left">
						<image class="record-icon" :src="item.type === 'morning' ? '/static/icons/check-circle.svg' : '/static/icons/clock.svg'" mode="aspectFit" />
						<view class="record-copy">
							<text class="record-name">{{ item.type === 'morning' ? '上班打卡' : '下班打卡' }}</text>
							<text class="record-date">{{ item.dateKey }}</text>
						</view>
					</view>

					<view class="record-right">
						<text class="record-value" :class="{ 'muted-value': item.status !== 'success' }">{{ item.status === 'success' ? item.displayTime : '未打卡' }}</text>
						<view class="record-location">
							<image class="location-icon" src="/static/icons/location.svg" mode="aspectFit" />
							<text class="location-text">{{ item.department }}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>

		<app-tabbar current="records" :theme="currentTheme" />
	</view>
</template>

	<script>
		import AppTabbar from '@/components/app-tabbar/index.vue'
		import { getUserCheckinRecords } from '@/utils/checkin-record'
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
				morningText: '未打卡',
				eveningText: '未打卡',
				morningChecked: false,
				eveningChecked: false,
				recordList: [],
				dayRecordList: []
			}
		},
		onShow() {
			const { userName, department } = getSession()
			this.userName = userName
			this.department = department
			this.currentTheme = getTheme()

			if (!this.userName || !this.department) {
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
			loadRecords() {
				this.recordList = getUserCheckinRecords({
					userName: this.userName,
					department: this.department
				})
				this.selectedDateKey = formatDateKey(new Date())
				this.refreshSelectedDate()
			},
			refreshSelectedDate() {
				const date = parseDateKey(this.selectedDateKey)
				this.selectedDateText = getDisplayDateText(date)
				this.selectedWeekText = getWeekText(date)
				const dayRecords = this.recordList.filter((item) => item.dateKey === this.selectedDateKey)
				this.dayRecordList = dayRecords
				const morningRecord = dayRecords.find((item) => item.type === 'morning' && item.status === 'success')
				const eveningRecord = dayRecords.find((item) => item.type === 'evening' && item.status === 'success')
				this.morningText = morningRecord ? morningRecord.displayTime : '未打卡'
				this.eveningText = eveningRecord ? eveningRecord.displayTime : '未打卡'
				this.morningChecked = !!morningRecord
				this.eveningChecked = !!eveningRecord
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
	.theme-dark .summary-time,
	.theme-dark .section-title,
	.theme-dark .record-name,
	.theme-dark .record-value {
		color: #f3f4f6;
	}

	.theme-dark .date-text,
	.theme-dark .summary-label,
	.theme-dark .summary-state,
	.theme-dark .section-side,
	.theme-dark .record-date,
	.theme-dark .location-text,
	.theme-dark .empty-text,
	.theme-dark .muted-time,
	.theme-dark .muted-state,
	.theme-dark .muted-value {
		color: #9ca3af;
	}

	.theme-dark .date-bar,
	.theme-dark .summary-card,
	.theme-dark .list-card {
		background: rgba(24, 27, 33, 0.96);
		box-shadow: none;
	}

	.scroll {
		height: 100%;
		box-sizing: border-box;
		padding: 156rpx 30rpx 132rpx;
	}

	.header-row,
	.date-bar,
	.date-center,
	.summary-card,
	.summary-main-row,
	.section-head,
	.record-top-row,
	.record-bottom-row,
	.record-left,
	.record-location {
		display: flex;
		align-items: center;
	}

	.header-row,
	.section-head,
	.record-top-row,
	.record-bottom-row {
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
	.summary-card,
	.list-card {
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 12rpx 30rpx rgba(45, 68, 128, 0.06);
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

	.summary-card {
		width: 640rpx;
		margin: 46rpx auto 0;
		padding: 28rpx 0 26rpx;
		border-radius: 28rpx;
	}

	.summary-col {
		flex: 1;
		padding: 0 28rpx;
		box-sizing: border-box;
	}

	.summary-divider {
		width: 1rpx;
		height: 140rpx;
		background: rgba(228, 233, 242, 0.9);
	}

	.summary-label {
		display: block;
		color: #4f586b;
		font-size: 24rpx;
		font-weight: 600;
		line-height: 1.2;
	}

	.summary-main-row {
		gap: 10rpx;
		align-items: center;
	}

	.summary-copy {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.summary-icon {
		width: 66rpx;
		height: 66rpx;
		flex-shrink: 0;
	}

	.summary-time {
		color: #182033;
		font-size: 46rpx;
		font-weight: 700;
		line-height: 1;
		margin-top: 12rpx;
	}

	.muted-time {
		color: #a5acba;
	}

	.summary-state {
		display: block;
		margin-top: 12rpx;
		font-size: 22rpx;
		font-weight: 600;
	}

	.active-state {
		color: #2f6dff;
	}

	.muted-state {
		color: #a0a8b8;
	}

	.section-head {
		margin-top: 40rpx;
		width: 640rpx;
		margin-left: auto;
		margin-right: auto;
	}

	.section-title {
		color: #182033;
		font-size: 27rpx;
		font-weight: 700;
	}

	.section-side {
		color: #9aa3b3;
		font-size: 21rpx;
	}

	.list-card {
		width: 640rpx;
		margin-top: 18rpx;
		margin-left: auto;
		margin-right: auto;
		border-radius: 28rpx;
		overflow: hidden;
	}

	.empty-state {
		padding: 52rpx 28rpx;
		text-align: center;
	}

	.empty-text {
		color: #9aa3b3;
		font-size: 24rpx;
	}

	.record-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 28rpx 28rpx 24rpx;
	}

	.record-item + .record-item {
		border-top: 1rpx solid rgba(229, 234, 242, 0.92);
	}

	.record-left {
		gap: 16rpx;
		min-width: 0;
	}

	.record-icon {
		width: 46rpx;
		height: 46rpx;
		flex-shrink: 0;
	}

	.record-copy,
	.record-right {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.record-right {
		align-items: flex-end;
		flex-shrink: 0;
	}

	.record-name {
		color: #182033;
		font-size: 28rpx;
		font-weight: 600;
		line-height: 1.2;
	}

	.record-value {
		color: #182033;
		font-size: 30rpx;
		font-weight: 700;
		line-height: 1.2;
	}

	.muted-value {
		color: #a4acbb;
	}

	.record-date,
	.location-text {
		color: #8b94a6;
		font-size: 21rpx;
		line-height: 1.2;
	}

	.record-date {
		margin-top: 12rpx;
	}

	.record-location {
		gap: 8rpx;
		margin-top: 12rpx;
	}

	.location-icon {
		width: 32rpx;
		height: 32rpx;
	}
</style>
