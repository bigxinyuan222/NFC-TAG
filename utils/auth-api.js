import { BASE_URL } from '@/utils/config'

const AUTH_PATHS = {
	register: '/api/auth/register',
	login: '/api/auth/login'
}

function request(path, data) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: BASE_URL + path,
			method: 'POST',
			data,
			success: (response) => {
				const body = response.data || {}
				const message = body.msg || body.message || '请求失败'

				if (response.statusCode < 200 || response.statusCode >= 300 || (typeof body.code === 'number' && body.code !== 0)) {
					reject(new Error(message))
					return
				}

				resolve(body)
			},
			fail: reject
		})
	})
}

export function registerAccount(data) {
	return request(AUTH_PATHS.register, data)
}

export function loginAccount(data) {
	return request(AUTH_PATHS.login, data)
}
