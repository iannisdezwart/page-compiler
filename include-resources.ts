import * as fs from 'fs'
import { FilePath } from './util'
import { resolve as resolvePath } from 'path'

export const includeResource = (resourcePath: string) => {
	const path = new FilePath(resourcePath)

	if (!fs.existsSync('root/res')) {
		fs.mkdirSync('root/res', { recursive: true })
	}

	fs.symlinkSync(resolvePath(resourcePath), `root/res/${ path.fullFilename() }`)
}