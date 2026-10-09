import { BASE_URL } from '@/utils/config'

const AUTH_PATHS = {
	register: '/api/register',
	login: '/api/login'
}

function request(path, data) {
	const url = BASE_URL + path
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'POST',
			header: {
				'Content-Type': 'application/json'
			},
			data,
			success: (response) => {
				const body = response.data || {}
				const message = body.msg || body.message || '请求失败'

				if (response.statusCode < 200 || response.statusCode >= 300 || (typeof body.code === 'number' && body.code !== 0)) {
					console.error('[认证接口响应失败]', {
						url,
						statusCode: response.statusCode,
						response: body
					})
					reject(new Error(message))
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
