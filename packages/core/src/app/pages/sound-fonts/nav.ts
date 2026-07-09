import type { Link } from '@app/utils/nav'
import { createNav } from '@app/utils/nav'

const path = 'sound-fonts'

const links: Link[] = [
  {
    path,
    text: 'Piano Example',
  },
  {
    path,
    subPath: 'note-objects',
    text: 'Note Objects',
  },
]

export default createNav(links)
