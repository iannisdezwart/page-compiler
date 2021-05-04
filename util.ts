import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
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