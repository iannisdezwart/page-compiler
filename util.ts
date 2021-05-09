import * as fs from 'fs'
import { resolve, resolve as resolvePath } from 'path'
import * as graphicsMagick from 'gm'
import * as chalk from 'chalk'

export class FilePath {
	directory: string
	filename: string
	extension: string

	constructor(path: string) {
		let i = path.length - 1

		while (path.charAt(i) != '/' && i > 0) i--

		const filenameAndExtension = path.slice(i + 1)
		this.directory = path.slice(0, i)

		i = filenameAndExtension.length - 1

		while (filenameAndExtension.charAt(i) != '.' && i > 0) i--

		if (i == 0) {
			this.filename = filenameAndExtension
		} else {
			this.filename = filenameAndExtension.slice(0, i)
			this.extension = filenameAndExtension.slice(i + 1)
		}
	}
}

export const deleteEmptyDirectories = (dirPath: string) => {
	const files = fs.readdirSync(dirPath)

	if (files.length == 0) {
		// This directory is empty, delete it

		fs.rmdirSync(dirPath)
		console.log(`${ chalk.green('✔') } Deleted empty directory: ${ chalk.red(resolvePath(dirPath)) }`)
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

	const finish = () => {
		resolve()
	}

	const imageWriteCallback = (path: string) => (err: Error) => {
		if (err != null) {
			console.error('error while converting image:', err)
			throw err
		}

		console.log(`${ chalk.green('✔') } Processed image: ${ chalk.yellow(resolvePath(path)) }`)

		finishedImages++
		if (finishedImages == dimensions.length) finish()
	}

	for (const dimension of dimensions) {
		const outputFilePath = `${ outputDirectory }/${ outputFilename }-${ dimension.width }x${ dimension.height }.${ filePath.extension }`

		imageMagick(inputPath)
			.resize(dimension.width, dimension.height, '>')
			.quality(quality)
			.write(outputFilePath, imageWriteCallback(outputFilePath))
	}
})