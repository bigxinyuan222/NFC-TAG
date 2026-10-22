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

	const TAB_ICON = {
		checkin: 'home',
		records: 'record',
		profile: 'profile'
	}

	export default {
		props: {
			current: {
				type: String,
				default: 'checkin'
			},
			// 由页面传入当前的皮肤 class（如 skin-mint），用于切换对应配色的图标
			skin: {
				type: String,
				default: 'skin-sunny'
			}
		},
		computed: {
			skinId() {
				const skin = this.skin || 'skin-sunny'
				return skin.indexOf('skin-') === 0 ? skin.slice(5) : skin
			}
		},
		methods: {
			getIcon(name) {
				const iconName = TAB_ICON[name] || 'home'
				const state = this.current === name ? 'active' : 'muted'
				// 暖阳皮肤沿用原始图标，其余皮肤使用按配色重新着色的副本
				const dir = this.skinId === 'sunny' ? '/static/icons' : '/static/icons/skins/' + this.skinId
				return dir + '/' + iconName + '-' + state + '.svg'
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
		background: var(--sk-card);
		box-shadow: 0 -8rpx 20rpx var(--sk-shadow-sm);
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		color: var(--sk-tab-muted);
	}

	.tab-item.active {
		color: var(--sk-accent);
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
