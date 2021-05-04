import * as fs from 'fs'
import * as https from 'https'

export const inlineJS = (path: string) => /* html */ `
<script>
	${ fs.readFileSync(path, 'utf-8') }
</script>
`

export const inlineCSS = (path: string) => /* html */ `
<style>
	${ fs.readFileSync(path, 'utf-8') }
</style>
`

export const inlineExternalJS = (url: string) => new Promise<string>(resolve => {
	let html = '<script>'

	https.get(url, res => {
		let content = ''

		res.on('data', chunk => content += chunk)

		res.on('end', () => {
			html += content + '</script>'
			resolve(html)
		})
	})
})

export const inlineExternalCSS = (url: string) => new Promise<string>(resolve => {
	let html = '<style>'

	https.get(url, res => {
		let content = ''

		res.on('data', chunk => content += chunk)

		res.on('end', () => {
			html += content + '</style>'
			resolve(html)
		})
	})
})