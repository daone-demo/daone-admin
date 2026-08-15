import { computed, ref, type ComputedRef, type Ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "@/api/admin";
import type { ResourceField } from "../resourceData";
import { isVideoCoverUrl } from "./resourceFormatters";

export interface BatchMediaItem {
  uid: string;
  name: string;
  url: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export interface UseBatchMediaUploadOptions {
  resourceKey: ComputedRef<string> | Ref<string>;
  form: Record<string, any>;
  isMaterialResource: ComputedRef<boolean>;
}

export const useBatchMediaUpload = (options: UseBatchMediaUploadOptions) => {
  const { resourceKey, form, isMaterialResource } = options;
  const uploadFieldLoading = ref<Record<string, boolean>>({});
  const inspirationMediaItems = ref<BatchMediaItem[]>([]);
  const inspirationBatchUploading = ref(false);
  const materialMediaItems = ref<BatchMediaItem[]>([]);
  const materialBatchUploading = ref(false);

  const isInspirationBatchUploadField = (field: ResourceField) =>
    resourceKey.value === "inspirations" && field.key === "coverUrl";

  const isMaterialBatchUploadField = (field: ResourceField) =>
    resourceKey.value === "materials" &&
    field.key === "resourceUrl" &&
    ["IMAGE", "VIDEO"].includes(String(form.type || ""));

  const isMaterialUploadField = (field: ResourceField) =>
    resourceKey.value === "materials" && field.key === "resourceUrl";

  const isMaterialUploadDisabled = computed(
    () => resourceKey.value === "materials" && !String(form.type || "").trim()
  );

  const isBatchUploadField = (field: ResourceField) =>
    isInspirationBatchUploadField(field) || isMaterialBatchUploadField(field);

  const getBatchMediaItemsRef = (field: ResourceField) =>
    isMaterialBatchUploadField(field)
      ? materialMediaItems
      : inspirationMediaItems;

  const getBatchUploadingRef = (field: ResourceField) =>
    isMaterialBatchUploadField(field)
      ? materialBatchUploading
      : inspirationBatchUploading;

  const matchesMaterialType = (file: File, type: string) => {
    if (type === "IMAGE") {
      return (
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name)
      );
    }
    if (type === "VIDEO") {
      return (
        file.type.startsWith("video/") ||
        /\.(mp4|webm|ogg|mov|m4v|avi)$/i.test(file.name)
      );
    }
    return isMediaFile(file);
  };

  const isMediaFile = (file: File) =>
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    /\.(jpe?g|png|gif|webp|bmp|svg|mp4|webm|ogg|mov|m4v|avi)$/i.test(file.name);

  const readDirectoryEntries = (reader: FileSystemDirectoryReader) =>
    new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

  const entryToFile = (entry: FileSystemFileEntry) =>
    new Promise<File>((resolve, reject) => {
      entry.file(resolve, reject);
    });

  const collectMediaFilesFromEntry = async (
    entry: FileSystemEntry
  ): Promise<File[]> => {
    if (entry.isFile) {
      const file = await entryToFile(entry as FileSystemFileEntry);
      return isMediaFile(file) ? [file] : [];
    }
    if (!entry.isDirectory) return [];

    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const files: File[] = [];
    let batch: FileSystemEntry[] = [];
    do {
      batch = await readDirectoryEntries(reader);
      for (const child of batch) {
        files.push(...(await collectMediaFilesFromEntry(child)));
      }
    } while (batch.length > 0);
    return files;
  };

  const collectMediaFiles = async (
    source: DataTransferItemList | FileList
  ): Promise<File[]> => {
    if (source instanceof FileList) {
      return Array.from(source).filter(isMediaFile);
    }

    const files: File[] = [];
    for (const item of Array.from(source)) {
      const entry = item.webkitGetAsEntry?.();
      if (!entry) {
        const file = item.getAsFile();
        if (file && isMediaFile(file)) files.push(file);
        continue;
      }
      files.push(...(await collectMediaFilesFromEntry(entry)));
    }
    return files;
  };

  const resetInspirationMedia = () => {
    inspirationMediaItems.value = [];
    inspirationBatchUploading.value = false;
  };

  const resetMaterialMedia = () => {
    materialMediaItems.value = [];
    materialBatchUploading.value = false;
  };

  const getInspirationMediaUrls = () =>
    inspirationMediaItems.value
      .filter(item => item.status === "success" && item.url)
      .map(item => item.url);

  const getMaterialMediaUrls = () =>
    materialMediaItems.value
      .filter(item => item.status === "success" && item.url)
      .map(item => item.url);

  const syncInspirationFormCoverUrl = () => {
    form.coverUrl = getInspirationMediaUrls()[0] || "";
  };

  const syncMaterialFormResourceUrl = () => {
    form.resourceUrl = getMaterialMediaUrls()[0] || "";
  };

  const activeBatchMediaItems = computed(() =>
    resourceKey.value === "materials"
      ? materialMediaItems.value
      : inspirationMediaItems.value
  );

  const activeBatchUploading = computed(() =>
    resourceKey.value === "materials"
      ? materialBatchUploading.value
      : inspirationBatchUploading.value
  );

  const BATCH_UPLOAD_PROGRESS_CAP = 90;

  const getBatchItemDisplayProgress = (item: BatchMediaItem) => {
    if (item.status === "success") return 100;
    if (item.status === "uploading") {
      return Math.min(item.progress, BATCH_UPLOAD_PROGRESS_CAP);
    }
    return item.progress;
  };

  const activeBatchUploadProgress = computed(() => {
    const items = activeBatchMediaItems.value;
    if (!items.length) return 0;
    const total = items.reduce(
      (sum, item) => sum + getBatchItemDisplayProgress(item),
      0
    );
    return Math.round(total / items.length);
  });

  const activeBatchUploadSummary = computed(() => {
    const items = activeBatchMediaItems.value;
    return {
      total: items.length,
      success: items.filter(item => item.status === "success").length,
      failed: items.filter(item => item.status === "error").length,
      uploading: items.filter(item => item.status === "uploading").length
    };
  });

  const removeBatchMediaItem = (field: ResourceField, uid: string) => {
    const itemsRef = getBatchMediaItemsRef(field);
    itemsRef.value = itemsRef.value.filter(item => item.uid !== uid);
    if (isMaterialBatchUploadField(field)) {
      syncMaterialFormResourceUrl();
    } else {
      syncInspirationFormCoverUrl();
    }
  };

  const ensureBatchUploadReady = (field: ResourceField) => {
    if (!isMaterialBatchUploadField(field)) return true;
    if (!String(form.type || "").trim()) {
      ElMessage.warning("请先选择资源类型");
      return false;
    }
    return true;
  };

  const filterFilesForBatchUpload = (field: ResourceField, files: File[]) => {
    if (isMaterialBatchUploadField(field)) {
      const type = String(form.type || "");
      const matched = files.filter(file => matchesMaterialType(file, type));
      if (!matched.length) {
        ElMessage.warning(
          type === "VIDEO" ? "请上传视频文件" : "请上传图片文件"
        );
        return [];
      }
      if (matched.length < files.length) {
        ElMessage.warning(`已过滤不符合资源类型 ${type} 的文件`);
      }
      return matched;
    }

    const matched = files.filter(isMediaFile);
    if (!matched.length) {
      ElMessage.warning("请上传图片或视频文件");
    }
    return matched;
  };

  const enqueueBatchUpload = async (field: ResourceField, rawFiles: File[]) => {
    if (!ensureBatchUploadReady(field)) return;

    const files = filterFilesForBatchUpload(field, rawFiles);
    if (!files.length) return;

    const itemsRef = getBatchMediaItemsRef(field);
    const uploadingRef = getBatchUploadingRef(field);
    const newItems: BatchMediaItem[] = files.map(file => ({
      uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      url: "",
      status: "pending",
      progress: 0
    }));
    itemsRef.value.push(...newItems);
    uploadingRef.value = true;

    const uploadSingle = async (file: File, item: BatchMediaItem) => {
      const itemIndex = itemsRef.value.findIndex(
        currentItem => currentItem.uid === item.uid
      );
      if (itemIndex < 0) return false;

      itemsRef.value[itemIndex].status = "uploading";
      try {
        const result = await adminApi.uploadFile(file, percent => {
          itemsRef.value[itemIndex].progress = Math.min(
            percent,
            BATCH_UPLOAD_PROGRESS_CAP
          );
        });
        itemsRef.value[itemIndex].url = result.url || "";
        itemsRef.value[itemIndex].status = "success";
        itemsRef.value[itemIndex].progress = 100;
        return true;
      } catch (error: any) {
        itemsRef.value[itemIndex].status = "error";
        itemsRef.value[itemIndex].error = error?.message || "上传失败";
        itemsRef.value[itemIndex].progress = 0;
        return false;
      }
    };

    const results = await Promise.all(
      files.map((file, index) => uploadSingle(file, newItems[index]))
    );
    const successCount = results.filter(Boolean).length;
    uploadingRef.value = false;

    if (isMaterialBatchUploadField(field)) {
      syncMaterialFormResourceUrl();
    } else {
      syncInspirationFormCoverUrl();
    }

    const failedCount = files.length - successCount;
    if (successCount === files.length) {
      ElMessage.success(`成功上传 ${successCount} 个文件`);
    } else if (successCount > 0) {
      ElMessage.warning(
        `上传完成：成功 ${successCount} 个，失败 ${failedCount} 个`
      );
    } else {
      ElMessage.error("上传失败");
    }
  };

  const openBatchMediaPicker = (
    field: ResourceField,
    pickerOptions: { directory?: boolean } = {}
  ) => {
    if (!ensureBatchUploadReady(field)) return;
    if (getBatchUploadingRef(field).value) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    const materialType = String(form.type || "");
    input.accept =
      isMaterialBatchUploadField(field) && materialType === "VIDEO"
        ? "video/*"
        : isMaterialBatchUploadField(field) && materialType === "IMAGE"
          ? "image/*"
          : "image/*,video/*";
    if (pickerOptions.directory) {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
    }
    input.onchange = async event => {
      const target = event.target as HTMLInputElement;
      const files = target.files ? await collectMediaFiles(target.files) : [];
      if (files.length) await enqueueBatchUpload(field, files);
    };
    input.click();
  };

  const triggerBatchFileSelect = (field: ResourceField) => {
    openBatchMediaPicker(field);
  };

  const triggerBatchFolderSelect = (field: ResourceField) => {
    openBatchMediaPicker(field, { directory: true });
  };

  const handleBatchDrop = async (field: ResourceField, event: DragEvent) => {
    if (!ensureBatchUploadReady(field)) return;
    if (getBatchUploadingRef(field).value) return;
    const items = event.dataTransfer?.items;
    const files = items
      ? await collectMediaFiles(items)
      : Array.from(event.dataTransfer?.files || []).filter(isMediaFile);
    if (files.length) await enqueueBatchUpload(field, files);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("文件读取失败"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });

  const isUploadFieldLoading = (key: string) =>
    Boolean(uploadFieldLoading.value[key]);

  const uploadFieldFile = async (field: ResourceField, file: File) => {
    if (
      resourceKey.value === "materials" &&
      field.key === "resourceUrl" &&
      !String(form.type || "").trim()
    ) {
      ElMessage.warning("请先选择资源类型");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (resourceKey.value === "materials" && field.key === "resourceUrl") {
      const type = String(form.type || "");
      if (type === "IMAGE" && !isImage) {
        ElMessage.warning("请上传图片文件");
        return;
      }
      if (type === "VIDEO" && !isVideo) {
        ElMessage.warning("请上传视频文件");
        return;
      }
    }
    if (!isImage && !isVideo) {
      ElMessage.warning("请上传图片或视频文件");
      return;
    }

    uploadFieldLoading.value[field.key] = true;
    try {
      if (isMaterialResource.value || resourceKey.value === "inspirations") {
        const result = await adminApi.uploadFile(file);
        form[field.key] = result.url || "";
      } else {
        const fileBase64 = await fileToBase64(file);
        const asset = await adminApi.uploadAsset({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          fileSize: file.size,
          fileBase64
        });
        form[field.key] = asset.previewUrl || asset.url || "";
      }
      ElMessage.success("上传成功");
    } catch (error: any) {
      ElMessage.error(error?.message || "上传失败");
    } finally {
      uploadFieldLoading.value[field.key] = false;
    }
  };

  return {
    uploadFieldLoading,
    inspirationMediaItems,
    inspirationBatchUploading,
    materialMediaItems,
    materialBatchUploading,
    isInspirationBatchUploadField,
    isMaterialBatchUploadField,
    isMaterialUploadField,
    isMaterialUploadDisabled,
    isBatchUploadField,
    getBatchMediaItemsRef,
    getBatchUploadingRef,
    matchesMaterialType,
    isMediaFile,
    collectMediaFilesFromEntry,
    collectMediaFiles,
    resetInspirationMedia,
    resetMaterialMedia,
    getInspirationMediaUrls,
    getMaterialMediaUrls,
    syncInspirationFormCoverUrl,
    syncMaterialFormResourceUrl,
    activeBatchMediaItems,
    activeBatchUploading,
    getBatchItemDisplayProgress,
    activeBatchUploadProgress,
    activeBatchUploadSummary,
    removeBatchMediaItem,
    ensureBatchUploadReady,
    filterFilesForBatchUpload,
    enqueueBatchUpload,
    openBatchMediaPicker,
    triggerBatchFileSelect,
    triggerBatchFolderSelect,
    handleBatchDrop,
    fileToBase64,
    isVideoCoverUrl,
    isUploadFieldLoading,
    uploadFieldFile
  };
};

export type BatchMediaUploadState = ReturnType<typeof useBatchMediaUpload>;
