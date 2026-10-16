<template>
	<view v-if="visible" class="mask" @click.self="handleClose">
		<view class="panel">
			<view class="badge" :class="success ? 'badge-success' : 'badge-fail'">
				<text class="badge-text">{{ success ? '成功' : '失败' }}</text>
			</view>
			<text class="title">{{ success ? '打卡已完成' : '打卡未完成' }}</text>
			<text class="message">{{ message }}</text>
			<text v-if="pointId" class="meta">打卡点：{{ pointId }}</text>
			<text v-if="timeText" class="meta">时间：{{ timeText }}</text>
			<button class="action" @click="handleClose">我知道了</button>
		</view>
	</view>
</template>

<script>
	export default {
		props: {
			visible: {
				type: Boolean,
				default: false
			},
			success: {
				type: Boolean,
				default: true
			},
			message: {
				type: String,
				default: ''
			},
			pointId: {
				type: String,
				default: ''
			},
			timeText: {
				type: String,
				default: ''
			}
		},
		methods: {
			handleClose() {
				this.$emit('close')
			}
		}
	}
</script>

<style>
	.mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32rpx;
		background: rgba(33, 26, 20, 0.34);
		z-index: 99;
	}

	.panel {
		width: 100%;
		padding: 42rpx 34rpx 34rpx;
		border-radius: 28rpx;
		background: #ffffff;
		box-shadow: 0 24rpx 54rpx rgba(212, 162, 94, 0.22);
		text-align: center;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 120rpx;
		height: 56rpx;
		padding: 0 20rpx;
		border-radius: 999rpx;
	}

	.badge-success {
		background: rgba(79, 174, 124, 0.12);
	}

	.badge-fail {
		background: rgba(224, 104, 95, 0.12);
	}

	.badge-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #4FAE7C;
	}

	.badge-fail .badge-text {
		color: #E0685F;
	}

	.title {
		display: block;
		margin-top: 24rpx;
		color: #3D3226;
		font-size: 36rpx;
		font-weight: 700;
	}

	.message {
		display: block;
		margin-top: 18rpx;
		color: #7A6650;
		font-size: 26rpx;
		line-height: 1.7;
	}

	.meta {
		display: block;
		margin-top: 14rpx;
		color: #A08C77;
		font-size: 24rpx;
	}

	.action {
		margin-top: 30rpx;
		height: 88rpx;
		line-height: 88rpx;
		border: 0;
		border-radius: 20rpx;
		background: linear-gradient(135deg, #FFB84D 0%, #F59A23 100%);
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 600;
	}

	.action::after {
		border: 0;
	}
</style>
