export const encodeDirName = (dirName: string) => {
	return dirName.replace(/\/|\s/g, '-')
}