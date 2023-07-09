import chalk from 'chalk'
import * as fs from 'fs'
import { resolve as resolvePath } from 'path'
import { FilePath, log } from './util'

export const includeResource = (srcPath: string) => {
	const path = new FilePath(srcPath)
	const destPath = `root/res/${ path.fullFilename() }`

	if (!fs.existsSync('root/res')) {
		fs.mkdirSync('root/res', { recursive: true })
		log('debug', `Created directory: ${ chalk.yellow('root/res') }`)
	}

	if (!fs.existsSync(destPath)) {
		fs.symlinkSync(resolvePath(srcPath), destPath)
		log('debug', `Created symlink for resource: ${ chalk.yellow(srcPath) }`)
	}
}