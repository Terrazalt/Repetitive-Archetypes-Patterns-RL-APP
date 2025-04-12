import { json } from '@sveltejs/kit';
import { getIconsFromFolders } from '../../utils/get-icons/';

export async function GET() {
  return json(await getIconsFromFolders())
}
