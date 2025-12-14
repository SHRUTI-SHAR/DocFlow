// Comprehensive file category definitions supporting 100+ formats

export const FILE_CATEGORIES = {
  image: [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif',
    'heic', 'heif', 'avif', 'jfif', 'pjpeg', 'pjp', 'apng', 'raw', 'cr2', 'nef',
    'orf', 'sr2', 'arw', 'dng', 'rw2', 'pef', 'x3f', 'raf', 'dcr', 'kdc'
  ],
  video: [
    'mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'm4v',
    '3gp', '3g2', 'mpeg', 'mpg', 'm2v', 'mts', 'm2ts', 'ts', 'vob', 'divx',
    'xvid', 'rm', 'rmvb', 'asf', 'f4v', 'swf'
  ],
  audio: [
    'mp3', 'wav', 'ogg', 'oga', 'aac', 'flac', 'm4a', 'wma', 'aiff', 'aif',
    'mid', 'midi', 'opus', 'amr', 'ape', 'ac3', 'dts', 'ra', 'ram', 'wv',
    'mka', 'au', 'snd', 'voc', 'gsm'
  ],
  pdf: ['pdf'],
  document: [
    'doc', 'docx', 'odt', 'rtf', 'wpd', 'wps', 'pages', 'tex', 'ltx',
    'docm', 'dotx', 'dotm', 'dot', 'xps', 'oxps'
  ],
  spreadsheet: [
    'xls', 'xlsx', 'ods', 'csv', 'tsv', 'numbers', 'xlsm', 'xlsb', 'xltx',
    'xltm', 'xlt', 'xlam', 'xla', 'xlw', 'prn', 'dif', 'slk'
  ],
  presentation: [
    'ppt', 'pptx', 'odp', 'key', 'pps', 'ppsx', 'pptm', 'potx', 'potm',
    'pot', 'ppsm', 'sldx', 'sldm'
  ],
  code: [
    // Web
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx',
    'vue', 'svelte', 'astro', 'php', 'asp', 'aspx', 'jsp', 'ejs', 'pug', 'hbs',
    // Programming languages
    'py', 'rb', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'go',
    'rs', 'swift', 'kt', 'kts', 'scala', 'clj', 'cljs', 'erl', 'ex', 'exs',
    'fs', 'fsx', 'ml', 'mli', 'r', 'lua', 'pl', 'pm', 'tcl', 'awk', 'sed',
    // Shell/Scripts
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd', 'vbs',
    // Data/Config
    'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
    'properties', 'plist', 'lock',
    // Database
    'sql', 'sqlite', 'db', 'mdb', 'accdb',
    // Markup
    'md', 'markdown', 'rst', 'textile', 'org', 'adoc', 'asciidoc',
    // Other
    'graphql', 'gql', 'proto', 'thrift', 'wasm', 'wat', 'asm', 's',
    'makefile', 'dockerfile', 'vagrantfile', 'gemfile', 'rakefile',
    'gradle', 'pom', 'csproj', 'sln', 'vcxproj', 'xcodeproj', 'pbxproj'
  ],
  text: [
    'txt', 'text', 'log', 'readme', 'changelog', 'license', 'authors',
    'contributors', 'todo', 'notes', 'nfo', 'diz', 'srt', 'sub', 'vtt',
    'ass', 'ssa', 'lrc'
  ],
  archive: [
    'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', 'txz',
    'lz', 'lzma', 'z', 'cab', 'iso', 'dmg', 'pkg', 'deb', 'rpm', 'msi',
    'jar', 'war', 'ear', 'apk', 'ipa', 'appx', 'snap', 'flatpak', 'appimage'
  ],
  ebook: [
    'epub', 'mobi', 'azw', 'azw3', 'fb2', 'djvu', 'cbr', 'cbz', 'cb7', 'cbt'
  ],
  font: [
    'ttf', 'otf', 'woff', 'woff2', 'eot', 'fon', 'fnt', 'pfb', 'pfm'
  ],
  cad: [
    'dwg', 'dxf', 'stl', 'obj', 'fbx', 'dae', 'gltf', 'glb', '3ds', 'blend',
    'skp', 'step', 'stp', 'iges', 'igs', 'sat', 'catpart', 'catproduct'
  ],
  design: [
    'psd', 'ai', 'eps', 'indd', 'indt', 'xd', 'sketch', 'fig', 'afdesign',
    'afphoto', 'afpub', 'cdr', 'wmf', 'emf'
  ],
  email: [
    'eml', 'msg', 'mbox', 'pst', 'ost'
  ]
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES | 'unknown';

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

export function getFileCategory(fileName: string, mimeType?: string): FileCategory {
  const extension = getFileExtension(fileName);
  
  // Check by extension first
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if ((extensions as readonly string[]).includes(extension)) {
      return category as FileCategory;
    }
  }
  
  // Fallback to mime type
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
  }
  
  return 'unknown';
}

export function isPreviewSupported(fileName: string, mimeType?: string): boolean {
  const category = getFileCategory(fileName, mimeType);
  // These categories have native preview support
  const supportedCategories: FileCategory[] = [
    'image', 'video', 'audio', 'pdf', 'code', 'text',
    'document', 'spreadsheet', 'presentation'
  ];
  return supportedCategories.includes(category);
}

export function getSupportedFormatsCount(): number {
  return Object.values(FILE_CATEGORIES).reduce((acc, formats) => acc + formats.length, 0);
}

export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
    // Web
    'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
    // Programming
    'py': 'python', 'rb': 'ruby', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
    'go': 'go', 'rs': 'rust', 'swift': 'swift', 'kt': 'kotlin', 'scala': 'scala',
    'php': 'php', 'pl': 'perl', 'lua': 'lua', 'r': 'r',
    // Shell
    'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'ps1': 'powershell',
    // Data
    'json': 'json', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml', 'toml': 'toml',
    'sql': 'sql', 'graphql': 'graphql',
    // Markup
    'md': 'markdown', 'markdown': 'markdown', 'rst': 'restructuredtext',
    // Config
    'ini': 'ini', 'cfg': 'ini', 'conf': 'ini', 'env': 'bash',
    'dockerfile': 'dockerfile', 'makefile': 'makefile'
  };
  
  return languageMap[extension.toLowerCase()] || 'plaintext';
}
