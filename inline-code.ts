import * as fs from 'fs'
import * as https from 'https'
import * as LRU from 'lru-cache'
import * as sass from 'sass'

const scriptCache = new LRU<string, string>({
	max: 100 * 1024 * 1024, // 100 MB
	length: value => value.length
})

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

export const inlineSASS = (path: string) => {
	if (scriptCache.has(path)) {
		return scriptCache.get(path)
	}

	const compiledCSS = sass.renderSync({ file: path }).css.toString()
	scriptCache.set(path, compiledCSS)

	return /* html */ `
	<style>
		${ compiledCSS }
	</style>
	`
}

export const inlineExternalJS = (url: string) => new Promise<string>(resolve => {
	if (scriptCache.has(url)) {
		resolve(scriptCache.get(url))
		return
	}

	let html = '<script>'

	https.get(url, res => {
		let content = ''

		res.on('data', chunk => content += chunk)

		res.on('end', () => {
			html += content + '</script>'
			scriptCache.set(url, html)
			resolve(html)
		})
	})
})

export const inlineExternalCSS = (url: string) => new Promise<string>(resolve => {
	if (scriptCache.has(url)) {
		resolve(scriptCache.get(url))
		return
	}

	let html = '<style>'

	https.get(url, res => {
		let content = ''

		res.on('data', chunk => content += chunk)

		res.on('end', () => {
			html += content + '</style>'
			scriptCache.set(url, html)
			resolve(html)
		})
	})
})