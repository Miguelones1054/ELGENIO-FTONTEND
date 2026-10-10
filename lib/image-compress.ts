/**
 * Utilidad de compresión y optimización de imágenes en el navegador.
 * Reduce fotos pesadas de cámaras (10MB-40MB) a un formato web ultrarrápido (300KB-800KB)
 * preservando la nitidez cinematográfica y la alta definición para pantallas Retina y 4K.
 */

export type CompressOptions = {
  maxDimension?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

export async function compressImageFile(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxDimension = 2400,
    quality = 0.86,
    mimeType = "image/jpeg",
  } = options;

  // Solo procesar imágenes
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Si la imagen es SVG o GIF animado, no alterar
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  // Si ya es muy ligera (< 600 KB) y no es gigante, se puede omitir
  if (file.size < 600 * 1024) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const origWidth = bitmap.width;
    const origHeight = bitmap.height;

    // Calcular dimensiones proporcionales
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (origWidth > maxDimension || origHeight > maxDimension) {
      if (origWidth >= origHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.round((origHeight * maxDimension) / origWidth);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((origWidth * maxDimension) / origHeight);
      }
    }

    // Dibujar en canvas optimizado
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      bitmap.close();
      return file;
    }

    // Calidad alta de interpolación bicúbica
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob) {
      return file;
    }

    // Solo usar el comprimido si realmente redujo el peso
    if (blob.size < file.size) {
      const extension = mimeType === "image/webp" ? ".webp" : ".jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const newName = `${baseName}${extension}`;

      return new File([blob], newName, {
        type: mimeType,
        lastModified: Date.now(),
      });
    }

    return file;
  } catch (err) {
    console.warn("No se pudo comprimir la imagen en el cliente, subiendo original:", err);
    return file;
  }
}
