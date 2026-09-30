import { BASE_URL } from '@/utils/config'
import { getToken } from '@/utils/session'

export function getMyCheckins({ page = 1, pageSize = 20 } = {}) {
	const token = getToken()
	const url = BASE_URL + '/api/checkins/me?page=' + page + '&pageSize=' + pageSize

	return new Promise((resolve, reject) => {
		if (!token) {
			const error = new Error('登录状态已失效，请重新登录')
			error.isAuthError = true
			reject(error)
			return
		}

		uni.request({
			url,
			method: 'GET',
			header: {
				Authorization: 'Bearer ' + token
			},
			success: (response) => {
				const body = response.data && typeof response.data === 'object' ? response.data : {}
				const message = body.msg || body.message || '获取签到记录失败'
				const isAuthError = response.statusCode === 401 || response.statusCode === 403

				if (response.statusCode < 200 || response.statusCode >= 300 || body.code !== 0 || !body.data || !Array.isArray(body.data.items)) {
					const error = new Error(message)
					error.statusCode = response.statusCode
					error.code = body.code
					error.isAuthError = isAuthError
					console.error('[签到记录接口失败]', {
						url,
						statusCode: response.statusCode,
						response: body
					})
					reject(error)
					return
				}

				resolve({
					items: body.data.items,
					page: Number(body.data.page) || page,
					pageSize: Number(body.data.pageSize) || pageSize,
					total: Number(body.data.total) || 0
				})
			},
			fail: (error) => {
				const requestError = new Error(error && error.errMsg ? error.errMsg : '网络请求失败')
				requestError.isNetworkError = true
				requestError.originalError = error
				console.error('[签到记录网络失败]', { url, error })
				reject(requestError)
			}
		})
	})
}
