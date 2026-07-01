/**
 * Google Drive Integration
 * Enables attaching Google Drive files to tasks
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  size?: number;
}

/**
 * Get Google Drive files for a user
 */
export async function getDriveFiles(
  accessToken: string,
  query?: string
): Promise<DriveFile[]> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Drive files: ${response.status}`);
  }

  const data = await response.json();
  return data.files.map((file: any) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    size: file.size,
  }));
}

/**
 * Upload a file to Google Drive
 */
export async function uploadDriveFile(
  accessToken: string,
  file: File,
  parentId?: string
): Promise<DriveFile> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("metadata", JSON.stringify({
    name: file.name,
    parents: parentId ? [parentId] : undefined,
  }));

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    webViewLink: data.webViewLink,
    iconLink: `https://drive.google.com/friendlyicon?docid=${data.id}`,
    size: file.size,
  };
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("sheet")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📈";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "📁";
  return "📎";
}