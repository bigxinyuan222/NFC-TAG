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

			<view class="form-card password-card">
				<view class="card-title-row">
					<text class="card-title">修改密码</text>
				</view>
				<view class="field">
					<text class="field-label">原密码</text>
					<input class="field-input" password :value="passwordForm.oldPassword" @input="handlePasswordInput('oldPassword', $event)" maxlength="128" placeholder="请输入原密码" placeholder-class="field-placeholder" />
				</view>
				<view class="field">
					<text class="field-label">新密码</text>
					<input class="field-input" password :value="passwordForm.newPassword" @input="handlePasswordInput('newPassword', $event)" maxlength="128" placeholder="请输入新密码" placeholder-class="field-placeholder" />
				</view>
				<view class="field">
					<text class="field-label">确认新密码</text>
					<input class="field-input" password :value="passwordForm.confirmPassword" @input="handlePasswordInput('confirmPassword', $event)" maxlength="128" placeholder="请再次输入新密码" placeholder-class="field-placeholder" />
				</view>
				<view class="password-submit" @tap="handleChangePassword">
					<text class="password-submit-text">{{ isChangingPassword ? '提交中…' : '修改密码' }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	import { changePassword } from '@/api/auth'
	import { clearSession, getSession, saveSession } from '@/utils/session'
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
				},
				passwordForm: {
					oldPassword: '',
					newPassword: '',
					confirmPassword: ''
				},
				isChangingPassword: false
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
			handlePasswordInput(key, event) {
				this.passwordForm[key] = event.detail.value
			},
			async handleChangePassword() {
				if (this.isChangingPassword) return
				const oldPassword = this.passwordForm.oldPassword || ''
				const newPassword = this.passwordForm.newPassword || ''
				const confirmPassword = this.passwordForm.confirmPassword || ''

				if (!oldPassword || !newPassword || !confirmPassword) {
					uni.showToast({ title: '请填写完整密码信息', icon: 'none' })
					return
				}
				if (newPassword === oldPassword) {
					uni.showToast({ title: '新密码不能与旧密码相同', icon: 'none' })
					return
				}
				if (newPassword !== confirmPassword) {
					uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
					return
				}

				this.isChangingPassword = true
				try {
					await changePassword({ oldPassword, newPassword })
					this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' }
					uni.showToast({ title: '密码修改成功', icon: 'success' })
				} catch (error) {
					if (error && error.isAuthError) {
						clearSession()
						uni.reLaunch({ url: '/pages/login/index' })
						return
					}
					uni.showToast({ title: (error && error.message) || '密码修改失败', icon: 'none' })
				} finally {
					this.isChangingPassword = false
				}
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
		background: #FDF6E9;
	}

	.wrap {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		background: linear-gradient(180deg, #FFF9EF 0%, #FDF3E4 60%, #FBEDD9 100%);
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
		color: #3D3226;
		font-size: 32rpx;
		font-weight: 600;
	}

	.nav-action {
		color: #F59A23;
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
		box-shadow: 0 12rpx 30rpx rgba(212, 162, 94, 0.12);
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
		color: #A08C77;
		font-size: 24rpx;
	}

	.form-card {
		margin-top: 24rpx;
		padding: 8rpx 0;
	}

	.card-title-row {
		padding: 26rpx 28rpx 0;
	}

	.card-title {
		color: #3D3226;
		font-size: 28rpx;
		font-weight: 600;
	}

	.password-submit {
		margin: 16rpx 28rpx 28rpx;
		height: 84rpx;
		border-radius: 20rpx;
		background: linear-gradient(135deg, #FFB84D 0%, #F59A23 100%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.password-submit-text {
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 600;
	}

	.field {
		padding: 26rpx 28rpx;
	}

	.field + .field {
		border-top: 1rpx solid rgba(242, 231, 213, 0.95);
	}

	.field-label {
		display: block;
		color: #7A6650;
		font-size: 24rpx;
		margin-bottom: 16rpx;
	}

	.field-input {
		height: 80rpx;
		padding: 0 22rpx;
		border-radius: 20rpx;
		background: #fffaf2;
		color: #3D3226;
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.field-placeholder {
		color: #B9A88F;
	}

	.theme-dark {
		background: linear-gradient(180deg, #211A14 0%, #2A211A 55%, #211A14 100%);
	}

	.theme-dark .nav-title,
	.theme-dark .field-input {
		color: #F5E9D9;
	}

	.theme-dark .card-title {
		color: #F5E9D9;
	}

	.theme-dark .nav-action {
		color: #F5A623;
	}

	.theme-dark .avatar-card,
	.theme-dark .form-card {
		background: rgba(48, 39, 31, 0.96);
		box-shadow: none;
	}

	.theme-dark .field + .field {
		border-top-color: rgba(74, 61, 48, 0.9);
	}

	.theme-dark .field-label,
	.theme-dark .avatar-tip {
		color: #B09A83;
	}

	.theme-dark .field-input {
		background: #2A2219;
	}

	.theme-dark .field-placeholder {
		color: #8A7761;
	}
</style>
