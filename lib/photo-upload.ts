// Source photos can be large; only an optimized display image is sent to the app.
export const MAX_SOURCE_PHOTO_BYTES = 30 * 1024 * 1024;
export const MAX_LOGO_IMAGE_BYTES = 750 * 1024;
export const MAX_PRODUCT_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function photoType(file: Pick<File, 'name' | 'type'>) {
  const type = file.type.toLowerCase();
  if (type === 'image/jpg') return 'image/jpeg';
  if (type && type !== 'application/octet-stream') return type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',svg:'image/svg+xml'} as Record<string,string>)[extension || ''] || '';
}

export function validateSourcePhoto(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!PHOTO_TYPES.has(photoType(file))) return 'Choose a JPG, PNG, WebP, HEIC, or HEIF photo.';
  if (!file.size) return 'This photo is empty. Choose another photo.';
  if (file.size > MAX_SOURCE_PHOTO_BYTES) return 'Choose a photo up to 30 MB. Export a smaller copy for larger files.';
  return null;
}

function loadPhoto(file: File) {
  return new Promise<HTMLImageElement>((resolve,reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const release = () => URL.revokeObjectURL(url);
    const timer = setTimeout(() => { release(); image.src = ''; reject(new Error('The photo took too long to open. Try a smaller photo.')); }, 30000);
    image.onload = () => { clearTimeout(timer); release(); resolve(image); };
    image.onerror = () => {
      clearTimeout(timer); release();
      reject(new Error(['image/heic','image/heif'].includes(photoType(file))
        ? 'This browser cannot open that iPhone photo format. Open the app in updated Safari, or export the photo as JPG and choose it again.'
        : 'This photo could not be opened. Choose another JPG, PNG, or WebP image.'));
    };
    // Native browser decoding applies the photo orientation before canvas rendering.
    image.src = url;
  });
}

export async function optimizePhoto(file: File, options: {maxBytes:number;maxDimension:number}) {
  const error = validateSourcePhoto(file);
  if (error) throw new Error(error);
  const image = await loadPhoto(file);
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('The photo has no image dimensions. Choose another photo.');
  const scale = Math.min(1, options.maxDimension / Math.max(image.naturalWidth,image.naturalHeight));
  let width = Math.max(1,Math.round(image.naturalWidth*scale));
  let height = Math.max(1,Math.round(image.naturalHeight*scale));
  const type = ['image/png', 'image/webp'].includes(photoType(file)) ? 'image/png' : 'image/jpeg';
  const canvas = document.createElement('canvas');
  try {
    for (let pass=0;pass<10;pass++) {
      canvas.width=width; canvas.height=height;
      const context=canvas.getContext('2d');
      if (!context) throw new Error('This device could not prepare the photo. Try another browser.');
      context.drawImage(image,0,0,width,height);
      const blob = await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,type,Math.max(0.55,0.86-pass*0.06)));
      if (!blob) throw new Error('This photo could not be prepared. Try another photo.');
      if (blob.size <= options.maxBytes) {
        const base = file.name.replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'photo';
        return new File([blob],`${base}.${type==='image/png'?'png':'jpg'}`,{type,lastModified:Date.now()});
      }
      width=Math.max(1,Math.round(width*0.75)); height=Math.max(1,Math.round(height*0.75));
    }
    throw new Error('This photo is still too large after resizing. Choose another photo.');
  } finally {
    // Release the canvas backing store on memory-constrained mobile devices.
    canvas.width=0; canvas.height=0; image.src='';
  }
}
