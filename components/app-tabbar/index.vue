<template>
	<view class="tabbar" :class="theme === 'dark' ? 'theme-dark' : ''">
		<view class="tab-item" :class="{ active: current === 'checkin' }" @tap="switchTab('checkin')">
			<image class="tab-icon" :src="getIcon('checkin')" mode="aspectFit" />
			<text class="tab-label">首页</text>
		</view>
		<view class="tab-item" :class="{ active: current === 'records' }" @tap="switchTab('records')">
			<image class="tab-icon" :src="getIcon('records')" mode="aspectFit" />
			<text class="tab-label">记录</text>
		</view>
		<view class="tab-item" :class="{ active: current === 'profile' }" @tap="switchTab('profile')">
			<image class="tab-icon" :src="getIcon('profile')" mode="aspectFit" />
			<text class="tab-label">我的</text>
		</view>
	</view>
</template>

<script>
	const TAB_MAP = {
		checkin: '/pages/checkin/index',
		records: '/pages/records/index',
		profile: '/pages/profile/index'
	}

	export default {
		props: {
			current: {
				type: String,
				default: 'checkin'
			},
			theme: {
				type: String,
				default: 'light'
			}
		},
		methods: {
			getIcon(name) {
				const iconMap = {
					checkin: this.current === 'checkin' ? '/static/icons/home-active.svg' : '/static/icons/home-muted.svg',
					records: this.current === 'records' ? '/static/icons/record-active.svg' : '/static/icons/record-muted.svg',
					profile: this.current === 'profile' ? '/static/icons/profile-active.svg' : '/static/icons/profile-muted.svg'
				}
				return iconMap[name]
			},
			switchTab(name) {
				if (this.current === name) {
					return
				}

				uni.reLaunch({
					url: TAB_MAP[name]
				})
			}
		}
	}
</script>

<style>
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-around;
		height: 108rpx;
		padding-bottom: env(safe-area-inset-bottom);
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 -8rpx 20rpx rgba(32, 44, 80, 0.05);
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		color: #9ca3af;
	}

	.tab-item.active {
		color: #3b82f6;
	}

	.tab-icon {
		width: 42rpx;
		height: 42rpx;
	}

	.tab-label {
		font-size: 24rpx;
		line-height: 1;
	}

	.tabbar.theme-dark {
		background: rgba(17, 19, 24, 0.98);
		box-shadow: 0 -8rpx 20rpx rgba(0, 0, 0, 0.22);
	}

	.tabbar.theme-dark .tab-item {
		color: #9ca3af;
	}

	.tabbar.theme-dark .tab-item.active {
		color: #3b82f6;
	}
</style>
