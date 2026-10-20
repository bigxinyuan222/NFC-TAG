<template>
	<view class="tabbar">
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

				uni.redirectTo({
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
		box-shadow: 0 -8rpx 20rpx rgba(212, 162, 94, 0.10);
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		color: #C4B2A0;
	}

	.tab-item.active {
		color: #F59A23;
	}

	.tab-icon {
		width: 42rpx;
		height: 42rpx;
	}

	.tab-label {
		font-size: 24rpx;
		line-height: 1;
	}

</style>
