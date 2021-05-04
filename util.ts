import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
import * as chalk from 'chalk'

export const getDirectory = (path: string) => {
	let i = path.length - 1
	while (path.charAt(i) != '/' && path.length > 0) i--
	return path.slice(0, i)
}

export const getFilename = (path: string) => {
	let i = path.length - 1
	while (path.charAt(i) != '/' && path.length > 0) i--
	return path.slice(i + 1)
}

export const getFilenameWithoutExtension = (filename: string) => {
	let i = filename.length - 1
	while (filename.charAt(i) != '.' && filename.length > 0) i--
	return filename.slice(0, i)
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