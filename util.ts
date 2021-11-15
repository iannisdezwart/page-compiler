import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
import * as graphicsMagick from 'gm'
import * as chalk from 'chalk'
import { debug } from './exported-util'

type LogLevel = 'debug' | 'info' | 'err'

const logPrefixMap = new Map<LogLevel, string>([
	[ 'debug', chalk.blue('i') ],
	[ 'info', chalk.green('✔') ],
	[ 'err', chalk.yellow('✗') ],
])

export const log = (level: LogLevel, ...args: any[]) => {
	const now = Date.now()

	const YYYY = new Date(now).getFullYear().toString()
	const MM = (new Date(now).getMonth() + 1).toString().padStart(2, '0')
	const DD = new Date(now).getDate().toString().padStart(2, '0')

	const hh = new Date(now).getHours().toString().padStart(2, '0')
	const mm = new Date(now).getMinutes().toString().padStart(2, '0')
	const ss = new Date(now).getSeconds().toString().padStart(2, '0')
	const ms = new Date(now).getMilliseconds().toString().padStart(3, '0')

	const date = `${ YYYY }-${ MM }-${ DD }`
	const time = `${ hh }:${ mm }:${ ss }.${ ms }`
	const dateTime = `${ date } ${ time }`

	if (level == 'debug' && !debug) {
		return
	}

	console.log(`${ logPrefixMap.get(level) } ${ chalk.grey(dateTime) }`, ...args)
}

export class FilePath {
	directory: string
	filename: string
	extension: string

	constructor(path: string) {
		let i = path.length - 1

		while (path.charAt(i) != '/' && i >= 0) i--

		const filenameAndExtension = path.slice(i + 1)
		this.directory = path.slice(0, i + 1)

		i = filenameAndExtension.length - 1

		while (filenameAndExtension.charAt(i) != '.' && i > 0) i--

		if (i == 0) {
			this.filename = filenameAndExtension
			this.extension = ''
		} else {
			this.filename = filenameAndExtension.slice(0, i) ?? ''
			this.extension = filenameAndExtension.slice(i + 1) ?? ''
		}
	}

	fullFilename() {
		if (this.extension == '') {
			return this.filename
		}

		return `${ this.filename }.${ this.extension }`
	}
}

export const deleteEmptyDirectories = (dirPath: string) => {
	const files = fs.readdirSync(dirPath)

	if (files.length == 0) {
		// This directory is empty, delete it

		fs.rmdirSync(dirPath)
		log('info', `Deleted empty directory: ${ chalk.yellow(dirPath) }`)
	} else {
		// Recursively call deleteEmptyDirectories on any subdirectory

		for (let file of files) {
			const subDirPath = `${ dirPath }/${ file }`

			if (fs.statSync(subDirPath).isDirectory()) {
				deleteEmptyDirectories(subDirPath)
			}
		}
	}
}

export const dotDotSlashAttack = (path: string, root: string) => {
	const resolvedPath = resolvePath(path)
	const rootPath = resolvePath(root)

	if (!resolvedPath.startsWith(rootPath)) {
		return true
	}

	return false
}

interface Dimension {
	width: number
	height: number
}

const imageMagick = graphicsMagick.subClass({ imageMagick: true })

export const scaleImages = (
	inputPath: string,
	dimensions: Dimension[],
	quality: number,
	outputDirectory: string,
	outputFilename: string
) => new Promise<void>(resolve => {
	const filePath = new FilePath(inputPath)
	let finishedImages = 0

	const increment = () => {
		finishedImages++
		if (finishedImages == dimensions.length) resolve()
	}

	const imageWriteCallback = (path: string) => (err: Error) => {
		if (err != null) {
			console.error('error while converting image:', err)
			throw err
		}

		log('info', `Processed image: ${ chalk.yellow(path) }`)
		increment()
	}

	for (const dimension of dimensions) {
		const outputFilePath = `${ outputDirectory }/${ outputFilename }-${ dimension.width }x${ dimension.height }.${ filePath.extension }`
		if (fs.existsSync(outputFilePath)) {
			increment()
			continue
		}

		imageMagick(inputPath)
			.resize(dimension.width, dimension.height, '>')
			.quality(quality)
			.write(outputFilePath, imageWriteCallback(outputFilePath))
	}
})