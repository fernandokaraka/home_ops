import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";

/**
 * Upload a file to Supabase Storage
 * @param uri - Local file URI from image picker or document picker
 * @param bucket - Storage bucket name (e.g., 'attachments')
 * @param path - Destination path in bucket (e.g., 'household-id/filename.jpg')
 * @returns Public URL of uploaded file or null on error
 */
export async function uploadFile(
  uri: string,
  bucket: string,
  path: string
): Promise<string | null> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    // Decode base64 to ArrayBuffer for Supabase
    const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // Determine content type from file extension
    const contentType = getContentType(path);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading file to storage:", error);
      return null;
    }

    // Get public URL
    const publicUrl = getPublicUrl(bucket, data.path);
    return publicUrl;
  } catch (error) {
    console.error("Error in uploadFile:", error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @returns True if successful, false otherwise
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error("Error deleting file from storage:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteFile:", error);
    return false;
  }
}

/**
 * Get public URL for a file in Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @returns Public URL string
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get file info from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @returns File metadata or null on error
 */
export async function getFileInfo(
  bucket: string,
  path: string
): Promise<{ size: number; contentType: string } | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(
      path.split("/").slice(0, -1).join("/"),
      {
        search: path.split("/").pop(),
      }
    );

    if (error || !data || data.length === 0) {
      console.error("Error getting file info:", error);
      return null;
    }

    const file = data[0];
    return {
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || "application/octet-stream",
    };
  } catch (error) {
    console.error("Error in getFileInfo:", error);
    return null;
  }
}

/**
 * Get MIME type from file extension
 * @param filename - File name or path
 * @returns MIME type string
 */
function getContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    // Other
    json: "application/json",
    xml: "application/xml",
    zip: "application/zip",
  };

  return mimeTypes[extension || ""] || "application/octet-stream";
}

/**
 * Generate a unique file path for storage
 * @param householdId - Household ID for organizing files
 * @param filename - Original filename
 * @returns Unique storage path
 */
export function generateStoragePath(
  householdId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = filename.split(".").pop();
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // Sanitize filename (remove special characters)
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, "_");

  return `${householdId}/${timestamp}_${randomSuffix}_${sanitizedName}.${extension}`;
}
