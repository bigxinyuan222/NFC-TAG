<template>
	<view v-if="visible" class="result-mask" @click.self="handleClose" @touchmove.stop.prevent>
		<view class="result-panel" :class="{ 'result-panel-success': success }" role="dialog" aria-modal="true" :aria-label="success ? '打卡成功' : '打卡未完成'">
			<view v-if="success" class="result-cat-wrap">
				<view class="result-halo"></view>
				<image class="result-sparkle result-sparkle-1" :src="catAssets.sparkle.src" mode="aspectFit" />
				<image class="result-sparkle result-sparkle-2" :src="catAssets.sparkle.src" mode="aspectFit" />
				<image class="result-success-cat" :src="catAssets.cheer.src" mode="aspectFit" />
				<view class="result-check"><view class="result-check-mark"></view></view>
			</view>
			<view v-else class="result-fail-badge"><text>未完成</text></view>
			<text class="result-title">{{ success ? '打卡成功' : '打卡未完成' }}</text>
			<text class="result-message">{{ displayMessage }}</text>
			<view v-if="timeText" class="result-time-card" :class="{ 'result-time-card-fail': !success }">
				<text class="result-time-label">{{ success ? '本次打卡时间' : '本次尝试时间' }}</text>
				<text class="result-time-value">{{ timeText }}</text>
			</view>
			<text v-if="pointId" class="result-meta">打卡点：{{ pointId }}</text>
			<button class="result-action" hover-class="result-action-pressed" @click="handleClose">{{ success ? '好哒，继续加油' : '我知道了' }}</button>
		</view>
	</view>
</template>

<script>
	import catAssets from '@/utils/cat-assets'

	export default {
		data() {
			return { catAssets }
		},
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
		computed: {
			displayMessage() {
				if (this.success && (!this.message || /^(打卡成功|签到成功|操作成功)[！!。]?$/.test(this.message))) {
					return '喵～本次打卡已记录，继续加油呀'
				}
				return this.message || '本次打卡未完成，请稍后重试'
			}
		},
		watch: {
			visible: {
				immediate: true,
				handler(visible) {
					if (!visible || !this.success) return
					try {
						if (typeof uni.vibrateShort === 'function') {
							uni.vibrateShort({ type: 'light', fail() {} })
						}
					} catch (e) {
						// 设备不支持触感时，仍正常显示打卡结果。
					}
				}
			}
		},
		methods: {
			handleClose() {
				this.$emit('close')
			}
		}
	}
</script>

<style scoped>
	.result-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32rpx;
		box-sizing: border-box;
		background: rgba(33, 26, 20, 0.42);
		z-index: 99;
		animation: result-fade-in 0.2s ease-out both;
	}

	.result-panel {
		position: relative;
		width: 100%;
		max-width: 600rpx;
		max-height: 82vh;
		overflow-y: auto;
		box-sizing: border-box;
		padding: 42rpx 40rpx 36rpx;
		border: 2rpx solid var(--sk-accent-ring);
		border-radius: 40rpx;
		background: var(--sk-bg-1);
		box-shadow: 0 24rpx 54rpx var(--sk-shadow-xl);
		text-align: center;
		animation: result-panel-in 0.34s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	.result-panel-success {
		background: linear-gradient(165deg, var(--sk-bg-1) 0%, var(--sk-bg-2) 100%);
	}

	.result-fail-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 120rpx;
		height: 56rpx;
		padding: 0 20rpx;
		border-radius: 999rpx;
		background: var(--sk-danger-tint);
		font-size: 24rpx;
		font-weight: 600;
		color: var(--sk-danger);
	}

	.result-cat-wrap {
		position: relative;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		height: 240rpx;
		margin-bottom: 6rpx;
	}

	.result-halo {
		position: absolute;
		bottom: 0;
		width: 220rpx;
		height: 220rpx;
		border-radius: 50%;
		background: radial-gradient(circle, var(--sk-accent-halo) 0%, var(--sk-accent-tint-weak) 62%, transparent 72%);
	}

	.result-success-cat {
		position: relative;
		width: 250rpx;
		height: 250rpx;
		animation: result-cat-pop 0.56s 0.08s ease-out both;
	}

	.result-check {
		position: absolute;
		right: 108rpx;
		bottom: 12rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 58rpx;
		height: 58rpx;
		border: 6rpx solid var(--sk-bg-1);
		border-radius: 50%;
		background: var(--sk-success);
		animation: result-cat-pop 0.35s 0.25s ease-out both;
	}

	.result-check-mark {
		width: 23rpx;
		height: 12rpx;
		margin-top: -6rpx;
		border-left: 5rpx solid #fff;
		border-bottom: 5rpx solid #fff;
		transform: rotate(-45deg);
	}

	.result-sparkle {
		position: absolute;
		width: 44rpx;
		height: 44rpx;
		pointer-events: none;
		animation: result-sparkle 1.6s ease-in-out 2 both;
	}

	.result-sparkle-1 {
		top: 32rpx;
		left: 50rpx;
	}

	.result-sparkle-2 {
		top: 68rpx;
		right: 44rpx;
		animation-delay: 0.7s;
	}

	.result-title {
		display: block;
		margin-top: 18rpx;
		color: var(--sk-text);
		font-size: 44rpx;
		font-weight: 700;
		letter-spacing: 2rpx;
	}

	.result-message {
		display: block;
		margin-top: 14rpx;
		color: var(--sk-text-3);
		font-size: 26rpx;
		line-height: 1.7;
		word-break: break-word;
	}

	.result-time-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 30rpx;
		padding: 24rpx 28rpx;
		border: 2rpx solid var(--sk-accent-ring);
		border-radius: 24rpx;
		background: var(--sk-accent-tint-weak);
	}

	.result-time-label {
		color: var(--sk-text-3);
		font-size: 24rpx;
	}

	.result-time-value {
		color: var(--sk-accent-deep);
		font-size: 44rpx;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.result-time-card-fail .result-time-value {
		color: var(--sk-text-3);
		font-size: 32rpx;
	}

	.result-meta {
		display: block;
		margin-top: 14rpx;
		color: var(--sk-text-muted);
		font-size: 24rpx;
	}

	.result-action {
		width: 100%;
		padding: 0;
		box-sizing: border-box;
		margin-top: 32rpx;
		height: 92rpx;
		line-height: 92rpx;
		border: 0;
		border-radius: 24rpx;
		background: linear-gradient(135deg, var(--sk-accent-light) 0%, var(--sk-accent) 100%);
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 600;
	}

	.result-action::after {
		border: 0;
	}

	.result-action-pressed {
		opacity: 0.85;
		transform: scale(0.98);
	}

	@keyframes result-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes result-panel-in {
		from { transform: translateY(24rpx) scale(0.94); opacity: 0; }
		to { transform: translateY(0) scale(1); opacity: 1; }
	}

	@keyframes result-cat-pop {
		0% { transform: translateY(18rpx) scale(0.65); opacity: 0; }
		60% { transform: translateY(-6rpx) scale(1.06); opacity: 1; }
		100% { transform: translateY(0) scale(1); opacity: 1; }
	}

	@keyframes result-sparkle {
		0%, 100% { transform: scale(0.8); opacity: 0.5; }
		50% { transform: scale(1.15); opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.result-mask, .result-panel, .result-success-cat, .result-check, .result-sparkle {
			animation: none;
		}
	}
</style>
