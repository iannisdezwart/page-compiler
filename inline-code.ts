import * as fs from 'fs'
import * as https from 'https'
import * as LRU from 'lru-cache'
import * as sass from 'sass'
import * as autoprefixer from 'autoprefixer'
import postcss from 'postcss'
import * as chalk from 'chalk'
import { log } from './util'

const scriptCache = new LRU<string, string>({
	max: 100 * 1024 * 1024, // 100 MB
	length: value => value.length
})

const prefixCSS = (css: string) => new Promise<string>(resolve => {
	log('debug', `Prefixing CSS`)

	const browsersList = fs.existsSync('.browserslistrc')
		? fs.readFileSync('.browserslistrc', 'utf-8').split('\n')
		: [ '> 0.01%' ]

	postcss([ autoprefixer({ overrideBrowserslist: browsersList }) ])
		.process(css, {
			from: null
		})
		.then(result => {
			const warnings = result.warnings()

			for (const warning of warnings) {
				console.error(warning)
			}

			resolve(result.css)
		})
})

export const inlineJS = async (path: string) => /* html */ `
<script>
	${ fs.readFileSync(path, 'utf-8') }
</script>
`

export const inlineCSS = async (path: string) => /* html */ `
<style>
	${ await prefixCSS(fs.readFileSync(path, 'utf-8')) }
</style>
`

export const inlineSASS = async (path: string) => {
	if (scriptCache.has(path)) {
		return scriptCache.get(path)
	}

	log('debug', `Compiling SASS: ${ chalk.yellow(path) }`)

	const compiledCSS = await prefixCSS(sass.renderSync({ file: path }).css.toString())
	scriptCache.set(path, compiledCSS)

	return /* html */ `
	<style>
		${ compiledCSS }
	</style>
	`
}

export const inlineExternalJS = (url: string) => new Promise<string>(resolve => {
	if (scriptCache.has(url)) {
		log('debug', `Using cached JS: ${ chalk.yellow(url) }`)
		resolve(scriptCache.get(url))
		return
	}

	log('debug', `Downloading JS: ${ chalk.yellow(url) }`)

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
		log('debug', `Using cached CSS: ${ chalk.yellow(url) }`)
		resolve(scriptCache.get(url))
		return
	}

	log('debug', `Downloading CSS: ${ chalk.yellow(url) }`)
 
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