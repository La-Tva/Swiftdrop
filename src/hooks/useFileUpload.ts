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

                // Simulate progress since fetch doesn't support upload progress
                const progressInterval = setInterval(() => {
                    setUploadingFiles((prev) =>
                        prev.map((f) =>
                            f.id === tempId ? { ...f, progress: Math.min(f.progress + 15, 85) } : f
                        )
                    );
                }, 300);

                const res = await fetch("/api/upload", { method: "POST", body: formData });
                clearInterval(progressInterval);

                if (!res.ok) throw new Error("Upload failed");

                setUploadingFiles((prev) =>
                    prev.map((f) => (f.id === tempId ? { ...f, progress: 100 } : f))
                );

                toast.success(`${file.name} uploaded`);
            } catch (err) {
                console.error(err);
                toast.error(`Failed to upload ${file.name}`);
            } finally {
                setTimeout(() => {
                    setUploadingFiles((prev) => prev.filter((f) => f.id !== tempId));
                }, 500);
            }
        },
        [spaceId, folderId]
    );

    const uploadFiles = useCallback(
        (files: File[]) => files.forEach((f) => uploadFile(f)),
        [uploadFile]
    );

    return { uploadingFiles, uploadFiles };
}
