import { BASE_URL } from '@/utils/config'
import { getToken } from '@/utils/session'

const AUTH_PATHS = {
	register: '/api/register',
	login: '/api/login',
	changePassword: '/api/change-password',
	dingLogin: '/api/dingtalk/login'
}

function request(path, data, useAuth = false) {
	const url = BASE_URL + path
	const header = {
		'Content-Type': 'application/json'
	}

	if (useAuth) {
		const token = getToken()
		if (!token) {
			const error = new Error('登录状态已失效，请重新登录')
			error.isAuthError = true
			return Promise.reject(error)
		}
		header.Authorization = 'Bearer ' + token
	}

	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'POST',
			header,
			data,
			success: (response) => {
				const body = response.data || {}
				const message = body.msg || body.message || '请求失败'
				const isAuthError = response.statusCode === 401 || response.statusCode === 403

				if (response.statusCode < 200 || response.statusCode >= 300 || (typeof body.code === 'number' && body.code !== 0)) {
					console.error('[认证接口响应失败]', {
						url,
						statusCode: response.statusCode,
						response: body
					})
					const error = new Error(message)
					error.isAuthError = isAuthError
					reject(error)
					return
				}

				resolve(body)
			},
			fail: (error) => {
				console.error('[认证接口网络失败]', {
					url,
					error
				})
				reject(error)
			}
		})
	})
}

export function registerAccount(data) {
	return request(AUTH_PATHS.register, data)
}

export function loginAccount(data) {
	return request(AUTH_PATHS.login, data)
}

export function changePassword({ oldPassword, newPassword }) {
	return request(AUTH_PATHS.changePassword, { oldPassword, newPassword }, true)
}

// 钉钉授权登录：把 authCode 交给后端，后端换用户并返回与账号密码登录一致的 token+user
export function loginByDingTalk(authCode) {
	return request(AUTH_PATHS.dingLogin, { authCode })
}
