export let debug = false
export const enableDebug = () => debug = true

export const encodeDirName = (dirName: string) => {
	return dirName.replace(/\/|\s/g, '-')
}