<template>
	<view class="wrap">
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
					<view class="field-input readonly-field">
						<text class="readonly-text">{{ form.userName }}</text>
						<text class="readonly-tip">不可修改</text>
					</view>
				</view>

				<view class="field">
					<text class="field-label">部门</text>
					<picker class="department-picker" mode="selector" :range="departmentOptions" :value="departmentIndex" @change="handleDepartmentChange">
						<view class="field-input picker-wrap">
							<text class="department-value" :class="{ 'field-placeholder': !form.department }">{{ form.department || '请选择部门' }}</text>
							<image class="picker-arrow" src="/static/icons/chevron-right.svg" mode="aspectFit" />
						</view>
					</picker>
				</view>

				<view class="field" @tap="openPasswordModal">
					<text class="field-label">修改密码</text>
					<view class="field-input password-entry">
						<text class="password-entry-text">点击修改登录密码</text>
						<image class="password-entry-arrow" src="/static/icons/menu-chevron-right.svg" mode="aspectFit" />
					</view>
				</view>
			</view>
		</scroll-view>

		<view v-if="showPasswordModal" class="modal-mask" @tap="closePasswordModal">
			<view class="modal-card" @tap.stop>
				<text class="modal-title">修改密码</text>
				<view class="modal-field">
					<text class="modal-label">原密码</text>
					<input class="modal-input" password :value="passwordForm.oldPassword" @input="handlePasswordInput('oldPassword', $event)" maxlength="128" placeholder="请输入原密码" placeholder-class="modal-placeholder" />
				</view>
				<view class="modal-field">
					<text class="modal-label">新密码</text>
					<input class="modal-input" password :value="passwordForm.newPassword" @input="handlePasswordInput('newPassword', $event)" maxlength="128" placeholder="请输入新密码" placeholder-class="modal-placeholder" />
				</view>
				<view class="modal-field">
					<text class="modal-label">确认新密码</text>
					<input class="modal-input" password :value="passwordForm.confirmPassword" @input="handlePasswordInput('confirmPassword', $event)" maxlength="128" placeholder="请再次输入新密码" placeholder-class="modal-placeholder" />
				</view>
				<view class="modal-actions">
					<view class="modal-btn modal-btn-cancel" @tap="closePasswordModal">
						<text class="modal-btn-cancel-text">取消</text>
					</view>
					<view class="modal-btn modal-btn-confirm" @tap="handleChangePassword">
						<text class="modal-btn-confirm-text">{{ isChangingPassword ? '提交中…' : '确认修改' }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { changePassword } from '@/api/auth'
	import { clearSession, getSession, saveSession } from '@/utils/session'

	export default {
		data() {
			return {
				avatarLoadFailed: false,
				form: {
					userName: '',
					department: '',
					avatarUrl: ''
				},
				departmentOptions: ['27鹰飞', '26鹰飞', '全栈二期', 'ROS机器人'],
				departmentIndex: 0,
				passwordForm: {
					oldPassword: '',
					newPassword: '',
					confirmPassword: ''
				},
				showPasswordModal: false,
				isChangingPassword: false
			}
		},
		onShow() {
			const { userName, department, avatarUrl } = getSession()
			this.avatarLoadFailed = false
			this.form.userName = userName
			this.form.department = department
			this.form.avatarUrl = avatarUrl
			const departmentIndex = this.departmentOptions.indexOf(department)
			this.departmentIndex = departmentIndex >= 0 ? departmentIndex : 0
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
			handleDepartmentChange(event) {
				const index = Number(event.detail.value)
				this.departmentIndex = index
				this.form.department = this.departmentOptions[index] || ''
			},
			handlePasswordInput(key, event) {
				this.passwordForm[key] = event.detail.value
			},
			openPasswordModal() {
				this.showPasswordModal = true
			},
			closePasswordModal() {
				if (this.isChangingPassword) return
				this.showPasswordModal = false
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
					this.showPasswordModal = false
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

	.modal-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
		background: rgba(30, 22, 12, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-card {
		width: 600rpx;
		max-width: 88vw;
		padding: 40rpx 32rpx 32rpx;
		box-sizing: border-box;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 18rpx 50rpx rgba(60, 40, 15, 0.18);
	}

	.modal-title {
		display: block;
		text-align: center;
		color: #3D3226;
		font-size: 32rpx;
		font-weight: 600;
	}

	.modal-field {
		margin-top: 26rpx;
	}

	.modal-label {
		display: block;
		color: #7A6650;
		font-size: 24rpx;
		margin-bottom: 14rpx;
	}

	.modal-input {
		height: 80rpx;
		padding: 0 22rpx;
		border-radius: 20rpx;
		background: #fffaf2;
		color: #3D3226;
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.modal-placeholder {
		color: #B9A88F;
	}

	.modal-actions {
		display: flex;
		gap: 20rpx;
		margin-top: 36rpx;
	}

	.modal-btn {
		flex: 1;
		height: 84rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-btn-cancel {
		background: #F5EBDC;
	}

	.modal-btn-cancel-text {
		color: #7A6650;
		font-size: 28rpx;
		font-weight: 600;
	}

	.modal-btn-confirm {
		background: linear-gradient(135deg, #FFB84D 0%, #F59A23 100%);
	}

	.modal-btn-confirm-text {
		color: #ffffff;
		font-size: 28rpx;
		font-weight: 600;
	}

	.field {
		padding: 26rpx 28rpx;
	}

	.password-entry {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.password-entry-text {
		color: #B9A88F;
		font-size: 28rpx;
	}

	.password-entry-arrow {
		width: 32rpx;
		height: 32rpx;
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

	.readonly-field {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.readonly-text {
		color: #3D3226;
		font-size: 28rpx;
	}

	.readonly-tip {
		color: #B9A88F;
		font-size: 24rpx;
	}

	.picker-wrap {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.department-value {
		font-size: 28rpx;
	}

	.picker-arrow {
		width: 32rpx;
		height: 32rpx;
		flex-shrink: 0;
	}

	.field-placeholder {
		color: #B9A88F;
	}

</style>
