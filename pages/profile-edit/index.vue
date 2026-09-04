<template>
	<view class="wrap" :class="currentTheme === 'dark' ? 'theme-dark' : 'theme-light'">
		<view class="nav-bar">
			<view class="status-bar"></view>
			<view class="nav-row">
				<view class="nav-back" @tap="goBack">
					<image class="nav-icon" src="/static/icons/chevron-left.svg" mode="aspectFit" />
				</view>
				<text class="nav-title">个人信息</text>
				<text class="nav-action" @tap="saveProfile">保存</text>
			</view>
		</view>

		<scroll-view class="scroll" scroll-y>
			<view class="avatar-card">
				<image class="avatar-image" :src="avatarLoadFailed || !form.avatarUrl ? '/static/icons/avatar-default.svg' : form.avatarUrl" mode="aspectFill" @tap="chooseAvatar" @error="handleAvatarError" />
				<text class="avatar-tip">点击更换头像</text>
			</view>

			<view class="form-card">
				<view class="field">
					<text class="field-label">姓名</text>
					<input class="field-input" :value="form.userName" @input="handleInput('userName', $event)" placeholder="请输入姓名" placeholder-class="field-placeholder" />
				</view>

				<view class="field">
					<text class="field-label">部门</text>
					<input class="field-input" :value="form.department" @input="handleInput('department', $event)" placeholder="请输入部门" placeholder-class="field-placeholder" />
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import { getSession, saveSession } from '@/utils/session'
	import { getTheme } from '@/utils/theme'

	export default {
		data() {
			return {
				currentTheme: 'light',
				avatarLoadFailed: false,
				form: {
					userName: '',
					department: '',
					avatarUrl: ''
				}
			}
		},
		onShow() {
			const { userName, department, avatarUrl } = getSession()
			this.currentTheme = getTheme()
			this.avatarLoadFailed = false
			this.form.userName = userName
			this.form.department = department
			this.form.avatarUrl = avatarUrl
		},
		methods: {
			goBack() {
				uni.navigateBack({
					fail: () => {
						uni.reLaunch({
							url: '/pages/profile/index'
						})
					}
				})
			},
			handleInput(key, event) {
				this.form[key] = event.detail.value
			},
			chooseAvatar() {
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						const tempFilePath = res.tempFilePaths[0] || ''

						if (!tempFilePath) {
							return
						}

						uni.saveFile({
							tempFilePath,
							success: (saveRes) => {
								this.avatarLoadFailed = false
								this.form.avatarUrl = saveRes.savedFilePath || tempFilePath
							},
							fail: () => {
								this.avatarLoadFailed = false
								this.form.avatarUrl = tempFilePath
							}
						})
					}
				})
			},
			handleAvatarError() {
				this.avatarLoadFailed = true
			},
			saveProfile() {
				const userName = (this.form.userName || '').trim()
				const department = (this.form.department || '').trim()

				if (!userName || !department) {
					uni.showToast({
						title: '请填写完整信息',
						icon: 'none'
					})
					return
				}

				saveSession({
					userName,
					department,
					avatarUrl: this.form.avatarUrl || ''
				})

				uni.showToast({
					title: '已保存',
					icon: 'success'
				})

				setTimeout(() => {
					this.goBack()
				}, 350)
			}
		}
	}
</script>

<style>
	page {
		background: #f6f8fc;
	}

	.wrap {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		background: linear-gradient(180deg, #ffffff 0%, #f7faff 52%, #ffffff 100%);
	}

	.nav-bar {
		position: relative;
		z-index: 20;
		flex-shrink: 0;
	}

	.status-bar {
		height: var(--status-bar-height);
	}

	.nav-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 88rpx;
		padding: 0 32rpx 8rpx;
		box-sizing: border-box;
	}

	.nav-back {
		width: 88rpx;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.nav-icon {
		width: 40rpx;
		height: 40rpx;
	}

	.nav-title {
		color: #1f2937;
		font-size: 32rpx;
		font-weight: 600;
	}

	.nav-action {
		color: #3b82f6;
		font-size: 28rpx;
		font-weight: 600;
		min-width: 88rpx;
		text-align: right;
	}

	.scroll {
		flex: 1;
		min-height: 0;
		box-sizing: border-box;
		padding: 0 32rpx 48rpx;
	}

	.avatar-card,
	.form-card {
		background: rgba(255, 255, 255, 0.98);
		border-radius: 28rpx;
		box-shadow: 0 12rpx 30rpx rgba(84, 102, 139, 0.08);
	}

	.avatar-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 42rpx 32rpx;
	}

	.avatar-image {
		width: 156rpx;
		height: 156rpx;
		border-radius: 50%;
	}

	.avatar-tip {
		margin-top: 18rpx;
		color: #8b95a7;
		font-size: 24rpx;
	}

	.form-card {
		margin-top: 24rpx;
		padding: 8rpx 0;
	}

	.field {
		padding: 26rpx 28rpx;
	}

	.field + .field {
		border-top: 1rpx solid rgba(229, 233, 241, 0.95);
	}

	.field-label {
		display: block;
		color: #4b5563;
		font-size: 24rpx;
		margin-bottom: 16rpx;
	}

	.field-input {
		height: 80rpx;
		padding: 0 22rpx;
		border-radius: 20rpx;
		background: #f7f9fc;
		color: #111827;
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.field-placeholder {
		color: #b6becb;
	}

	.theme-dark {
		background: linear-gradient(180deg, #0f1115 0%, #171a20 55%, #0f1115 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .field-input {
		color: #f3f4f6;
	}

	.theme-dark .nav-action {
		color: #e5e7eb;
	}

	.theme-dark .avatar-card,
	.theme-dark .form-card {
		background: rgba(27, 31, 38, 0.96);
		box-shadow: none;
	}

	.theme-dark .field + .field {
		border-top-color: rgba(58, 63, 73, 0.9);
	}

	.theme-dark .field-label,
	.theme-dark .avatar-tip {
		color: #9ca3af;
	}

	.theme-dark .field-input {
		background: #111318;
	}

	.theme-dark .field-placeholder {
		color: #6b7280;
	}
</style>
