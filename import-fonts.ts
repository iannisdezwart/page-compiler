import { inlineExternalCSS } from './inline-code'
import * as fs from 'fs'
import * as chalk from 'chalk'
import { log } from './util'
import { createHash } from 'crypto'

interface FontStyle {
	weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
	italic?: boolean
}

type CharacterSet = [ number, number ]

export const characterSets: { [ name: string ]: CharacterSet } = {
	basicLatin: [ 0x20, 0x7f ],
	latinExtended: [ 0xa0, 0x24f ]
}

export const importGoogleFont = async (
	fontFamily: string,
	styles: FontStyle[],
	charSets: CharacterSet[] = null
) => {
	const stylesString = styles
		.sort((a, b) => {
			if (a.italic && !b.italic) return 1
			if (b.italic && !a.italic) return -1
			return a.weight - b.weight
		})
		.map(style => `${ style.italic ? 1 : 0 },${ style.weight }`)
		.join(';')

	const hash = createHash('md5').update(fontFamily + stylesString).digest('hex')

	if (fs.existsSync(`cache/fonts/${ hash }.css`)) {
		log('debug', `Imported cached Google Font: ${ chalk.yellow(fontFamily) }`)
		return fs.readFileSync(`cache/fonts/${ hash }.css`, 'utf8')
	}

	log('debug', `Importing Google Font: ${ chalk.yellow(fontFamily) }`)

	let url = `https://fonts.googleapis.com/css2?family=${ fontFamily }:ital,wght@${ stylesString }&display=swap`

	if (charSets != null) {
		let text = ''

		for (const charSet of charSets) {
			for (let i = charSet[0]; i <= charSet[1]; i++) {
				text += String.fromCharCode(i)
			}
		}

		url += `&text=${ encodeURIComponent(text) }`
	}

	log('debug', `Downloading font: ${ chalk.yellow(url) }`)

	const css = /* html */ `
	<link rel="preconnect" href="https://fonts.gstatic.com">
	${ await inlineExternalCSS(url) }
	`

	const cachedFilename = `cache/fonts/${ hash }.css`

	if (!fs.existsSync('cache/fonts')) {
		fs.mkdirSync('cache/fonts', { recursive: true })
		log('debug', `Created cache directory: ${ chalk.yellow('cache/fonts') }`)
	}

	fs.writeFileSync(cachedFilename, css)

	return css
}