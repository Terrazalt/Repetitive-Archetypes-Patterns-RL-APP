import fs from 'fs/promises';
import path from 'path';

const defaultExtension = ".png"
const defaultLabelMarker = "pat"

const defaultFilesPath = "../frontend/static/data"

const labelFolders = await fs.readdir(defaultFilesPath)


export async function getIconsFromFolders(filesPath: string = defaultFilesPath, extension: string = defaultExtension, labelMarker: string = defaultLabelMarker): Promise<string[]> {
  const labels: string[] = []
  for (const folder of labelFolders) {
    const imagesPath = path.join(filesPath, folder)
    const images = await fs.readdir(imagesPath)
    for (const file of images) {
      if (file.includes(labelMarker) && file.endsWith(extension)) {
        labels.push(path.join(folder, file))
      }
    }
  }
  return labels
}

