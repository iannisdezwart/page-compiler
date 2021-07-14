import * as fs from 'fs'
import { FilePath } from './util'
import { resolve as resolvePath } from 'path'

export const includeResource = (srcPath: string) => {
	const path = new FilePath(srcPath)
	const destPath = `root/res/${ path.fullFilename() }`

	if (!fs.existsSync('root/res')) {
		fs.mkdirSync('root/res', { recursive: true })
	}

	if (!fs.existsSync(destPath)) {
		fs.symlinkSync(resolvePath(srcPath), destPath)
	}
}