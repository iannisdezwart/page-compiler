import * as fs from 'fs'
import * as https from 'https'
import * as LRU from 'lru-cache'
import * as sass from 'sass'
import * as chalk from 'chalk'
import { log } from './util'
import { createHash } from 'crypto'

// Lazy load autoprefixer and postcss, because it takes incredibly long to load
// I'm talking about ~2 seconds on my machine

let autoprefixer: any
let postcss: any

const scriptCache = new LRU<string, string>({
	max: 100 * 1024 * 1024, // 100 MB
	length: value => value.length
})

const prefixCSS = (css: string) => new Promise<string>(resolve => {
	const hash = createHash('md5').update(css).digest('hex')

	if (fs.existsSync(`cache/css/${ hash }.css`)) {
		log('debug', 'Using cached CSS')
		resolve(fs.readFileSync(`cache/css/${ hash }.css`, 'utf8'))
		return
	}

	log('debug', `Prefixing CSS`)

	const browsersList = fs.existsSync('.browserslistrc')
		? fs.readFileSync('.browserslistrc', 'utf-8').split('\n')
		: [ '> 0.01%' ]

	// Load autoprefixer and postcss lazily
	// Wish they were a bit faster

	if (autoprefixer == null) {
		log('debug', 'Loading autoprefixer...')
		autoprefixer = require('autoprefixer')({ browsers: browsersList })
	}

	if (postcss == null) {
		log('debug', 'Loading postcss...')
		postcss = require('postcss')
	}

	postcss([ autoprefixer({ overrideBrowserslist: browsersList }) ])
		.process(css, {
			from: null
		})
		.then((result: any) => {
			const warnings = result.warnings()

			for (const warning of warnings) {
				console.error(warning)
			}

			if (!fs.existsSync('cache/css')) {
				fs.mkdirSync('cache/css', { recursive: true })
			}

			fs.writeFileSync(`cache/css/${ hash }.css`, result.css)

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
	const file = fs.readFileSync(path, 'utf-8')
	const hash = createHash('md5').update(file).digest('hex')

	if (fs.existsSync(`cache/css/${ hash }.css`)) {
		log('debug', `Using cached compiled SASS file for ${ chalk.yellow(path) }`)

		return /* html */ `
		<style>
			${ fs.readFileSync(`cache/css/${ hash }.css`, 'utf-8') }
		</style>
		`
	}

	log('debug', `Compiling SASS: ${ chalk.yellow(path) }`)

	const compiledCSS = await prefixCSS(sass.renderSync({ file: path }).css.toString())

	if (!fs.existsSync('cache/css')) {
		fs.mkdirSync('cache/css', { recursive: true })
	}

	fs.writeFileSync(`cache/css/${ hash }.css`, compiledCSS)

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