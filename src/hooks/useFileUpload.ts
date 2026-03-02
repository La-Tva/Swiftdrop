"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UploadingFile {
    id: string;
    name: string;
    progress: number;
}

interface UseFileUploadOptions {
    spaceId: string;
    folderId?: string | null;
}

export function useFileUpload({ spaceId, folderId }: UseFileUploadOptions) {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

    const uploadFile = useCallback(
        async (file: File) => {
            const tempId = crypto.randomUUID();
            setUploadingFiles((prev) => [...prev, { id: tempId, name: file.name, progress: 0 }]);

            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("spaceId", spaceId);
                if (folderId) formData.append("folderId", folderId);
                formData.append("isEphemeral", "false"); // Default to false for manual uploads

                // Upload to our GridFS API with progress tracking
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open("POST", "/api/files/upload");

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const progress = Math.round((e.loaded / e.total) * 100);
                            setUploadingFiles((prev) =>
                                prev.map((f) => (f.id === tempId ? { ...f, progress } : f))
                            );
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            reject(new Error("Upload failed"));
                        }
                    };

                    xhr.onerror = () => reject(new Error("Network error"));
                    xhr.send(formData);
                });

                toast.success(`${file.name} uploaded successfully`);
            } catch (err) {
                console.error(err);
                toast.error(`Failed to upload ${file.name}`);
            } finally {
                setTimeout(() => {
                    setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));
                }, 1000);
            }
        },
        [spaceId, folderId]
    );

    const uploadFiles = useCallback(
        (files: File[]) => {
            files.forEach((f) => {
                // Reduced limit for MongoDB Atlas Free (512MB total cluster space)
                // We'll set a 50MB per file soft limit for images to be safe
                if (f.size > 50 * 1024 * 1024) {
                    toast.error(`${f.name} exceeds 50MB limit (Atlas Free Tier)`);
                    return;
                }
                uploadFile(f);
            });
        },
        [uploadFile]
    );

    return { uploadingFiles, uploadFiles };
}
