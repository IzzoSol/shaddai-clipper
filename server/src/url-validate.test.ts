import assert from 'node:assert'
import { assertSafePublicUrl } from './url-validate.ts'

// accepts a normal public https URL
assert.doesNotThrow(() => assertSafePublicUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'public https url is accepted')

// rejects non-https
assert.throws(() => assertSafePublicUrl('http://example.com/video.mp4'), /https/i, 'plain http is rejected')

// rejects loopback IP
assert.throws(() => assertSafePublicUrl('https://127.0.0.1/video.mp4'), /private|loopback|not allowed/i, 'loopback IP is rejected')
assert.throws(() => assertSafePublicUrl('https://localhost/video.mp4'), /private|loopback|not allowed/i, 'localhost hostname is rejected')

// rejects private IPv4 ranges
assert.throws(() => assertSafePublicUrl('https://10.0.0.5/video.mp4'), /private|not allowed/i, '10.x is rejected')
assert.throws(() => assertSafePublicUrl('https://172.16.0.5/video.mp4'), /private|not allowed/i, '172.16.x is rejected')
assert.throws(() => assertSafePublicUrl('https://192.168.1.5/video.mp4'), /private|not allowed/i, '192.168.x is rejected')

// rejects link-local
assert.throws(() => assertSafePublicUrl('https://169.254.169.254/latest/meta-data/'), /private|link-local|not allowed/i, '169.254.x (cloud metadata) is rejected')

// rejects malformed URLs cleanly (no crash, clear error)
assert.throws(() => assertSafePublicUrl('not a url'), /invalid url/i, 'malformed url is rejected')

console.log('✅ url-validate.test PASS')
