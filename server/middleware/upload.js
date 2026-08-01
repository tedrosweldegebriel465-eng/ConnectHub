/**
 * ============================================
 * UPLOAD MIDDLEWARE
 * Version: 2.0.0
 * Description: File upload configuration with multer
 *              supporting images, videos, and documents
 * ============================================
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// CONSTANTS
// ============================================

const UPLOAD_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  AVATAR: 'avatar',
  COVER: 'cover',
  STORY: 'story',
  POST: 'post',
  MESSAGE: 'message',
};

const FILE_SIZE_LIMITS = {
  [UPLOAD_TYPES.IMAGE]: 15 * 1024 * 1024, // 15MB
  [UPLOAD_TYPES.VIDEO]: 200 * 1024 * 1024, // 200MB (Supports 5-minute HD video)
  [UPLOAD_TYPES.DOCUMENT]: 25 * 1024 * 1024, // 25MB
  [UPLOAD_TYPES.AUDIO]: 50 * 1024 * 1024, // 50MB
  [UPLOAD_TYPES.AVATAR]: 10 * 1024 * 1024, // 10MB
  [UPLOAD_TYPES.COVER]: 15 * 1024 * 1024, // 15MB
  [UPLOAD_TYPES.STORY]: 200 * 1024 * 1024, // 200MB
  [UPLOAD_TYPES.POST]: 200 * 1024 * 1024, // 200MB
  [UPLOAD_TYPES.MESSAGE]: 50 * 1024 * 1024, // 50MB
};

const ALLOWED_MIME_TYPES = {
  [UPLOAD_TYPES.IMAGE]: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ],
  [UPLOAD_TYPES.VIDEO]: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/3gpp',
    'video/mpeg',
    'video/mov',
    'video/avi',
  ],
  [UPLOAD_TYPES.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  [UPLOAD_TYPES.AUDIO]: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
  ],
};

// ============================================
// DIRECTORY MANAGEMENT
// ============================================

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// ============================================
// STORAGE CONFIGURATION
// ============================================

/**
 * Create storage configuration for multer
 * @param {string} uploadPath - Base upload path
 * @returns {Object} Multer storage configuration
 */
const createStorage = (uploadPath = 'uploads') => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      let subFolder = '';
      
      // Determine subfolder based on field name or custom logic
      if (file.fieldname === 'avatar') {
        subFolder = 'avatars';
      } else if (file.fieldname === 'cover' || file.fieldname === 'coverPhoto') {
        subFolder = 'covers';
      } else if (file.fieldname === 'story' || file.fieldname === 'media') {
        subFolder = 'stories';
      } else if (file.fieldname === 'message' || file.fieldname === 'attachment') {
        subFolder = 'messages';
      } else if (file.fieldname === 'document') {
        subFolder = 'documents';
      } else {
        subFolder = 'posts';
      }

      const dirPath = path.join(process.cwd(), uploadPath, subFolder);
      ensureDirectoryExists(dirPath);
      cb(null, dirPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext)
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-');
      
      // Create user-specific prefix if authenticated
      const userId = req.user?._id || 'anonymous';
      const filename = `${userId}-${timestamp}-${random}${ext}`;
      
      cb(null, filename);
    },
  });
};

// ============================================
// FILE FILTER
// ============================================

/**
 * Create file filter for multer
 * @param {Array} allowedTypes - Array of UPLOAD_TYPES
 * @returns {Function} Multer file filter
 */
const createFileFilter = (allowedTypes = [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO]) => {
  return (req, file, cb) => {
    // Get allowed mime types for specified upload types
    let allowedMimeTypes = [];
    allowedTypes.forEach(type => {
      if (ALLOWED_MIME_TYPES[type]) {
        allowedMimeTypes = [...allowedMimeTypes, ...ALLOWED_MIME_TYPES[type]];
      }
    });

    // Check if file type is allowed
    const isAllowed = allowedMimeTypes.some(mimeType => {
      return file.mimetype === mimeType || 
             (file.mimetype.startsWith('image/') && allowedTypes.includes(UPLOAD_TYPES.IMAGE)) ||
             (file.mimetype.startsWith('video/') && allowedTypes.includes(UPLOAD_TYPES.VIDEO)) ||
             (file.mimetype.startsWith('audio/') && allowedTypes.includes(UPLOAD_TYPES.AUDIO));
    });

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`), false);
    }
  };
};

// ============================================
// MULTER CONFIGURATION
// ============================================

/**
 * Create multer instance with custom configuration
 * @param {Object} options - Configuration options
 * @returns {Object} Multer instance
 */
const createUpload = (options = {}) => {
  const {
    uploadPath = 'uploads',
    allowedTypes = [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO],
    maxSize = 200 * 1024 * 1024, // 200MB default (Up to 5 min video)
    fieldName = 'media',
    maxCount = 1,
  } = options;

  const storage = createStorage(uploadPath);
  const fileFilter = createFileFilter(allowedTypes);

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
      files: maxCount,
    },
  });
};

// ============================================
// PRE-CONFIGURED UPLOAD INSTANCES
// ============================================

// ===== General Upload (supports images and videos) =====
const upload = createUpload({
  allowedTypes: [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.POST],
});

// ===== Image Only Upload =====
const uploadImage = createUpload({
  allowedTypes: [UPLOAD_TYPES.IMAGE],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.IMAGE],
});

// ===== Video Only Upload =====
const uploadVideo = createUpload({
  allowedTypes: [UPLOAD_TYPES.VIDEO],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.VIDEO],
});

// ===== Avatar Upload =====
const uploadAvatar = createUpload({
  allowedTypes: [UPLOAD_TYPES.IMAGE],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.AVATAR],
  fieldName: 'avatar',
});

// ===== Cover Photo Upload =====
const uploadCover = createUpload({
  allowedTypes: [UPLOAD_TYPES.IMAGE],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.COVER],
  fieldName: 'cover',
});

// ===== Story Upload =====
const uploadStory = createUpload({
  allowedTypes: [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.STORY],
  fieldName: 'story',
});

// ===== Document Upload =====
const uploadDocument = createUpload({
  allowedTypes: [UPLOAD_TYPES.DOCUMENT],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.DOCUMENT],
  fieldName: 'document',
});

// ===== Message Attachment Upload =====
const uploadMessage = createUpload({
  allowedTypes: [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO, UPLOAD_TYPES.DOCUMENT],
  maxSize: FILE_SIZE_LIMITS[UPLOAD_TYPES.MESSAGE],
  fieldName: 'attachment',
});

// ===== Multiple File Upload =====
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return createUpload({
    allowedTypes: [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO, UPLOAD_TYPES.DOCUMENT],
    maxSize: 50 * 1024 * 1024,
    fieldName,
    maxCount,
  }).array(fieldName, maxCount);
};

// ===== Mixed File Upload (different fields) =====
const uploadMixed = (fields) => {
  const uploadInstance = createUpload({
    allowedTypes: [UPLOAD_TYPES.IMAGE, UPLOAD_TYPES.VIDEO, UPLOAD_TYPES.DOCUMENT],
    maxSize: 50 * 1024 * 1024,
  });
  return uploadInstance.fields(fields);
};

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Handle multer errors
 * @param {Error} err - Multer error
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'Upload error';
    let code = 'UPLOAD_ERROR';

    switch (err.code) {
      case 'FILE_TOO_LARGE':
        message = 'File too large. Maximum size: 200MB (Up to 5 min video)';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size: 200MB (Up to 5 min video)';
        code = 'LIMIT_FILE_SIZE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'LIMIT_FILE_COUNT';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'LIMIT_UNEXPECTED_FILE';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in request';
        code = 'LIMIT_PART_COUNT';
        break;
      default:
        message = err.message || 'Upload error';
        code = 'UPLOAD_ERROR';
    }

    return res.status(400).json({
      success: false,
      message,
      code,
      field: err.field,
    });
  }

  if (err.message && err.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'FILE_TYPE_NOT_ALLOWED',
    });
  }

  next(err);
};

// ============================================
// FILE HELPER FUNCTIONS
// ============================================

/**
 * Delete a file from the filesystem
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} Success status
 */
const deleteFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Delete multiple files from the filesystem
 * @param {Array} filePaths - Array of file paths
 * @returns {Promise<Object>} Results
 */
const deleteFiles = async (filePaths) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const filePath of filePaths) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        results.success.push(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      results.failed.push({ filePath, error: error.message });
    }
  }

  return results;
};

/**
 * Get file info
 * @param {Object} file - Multer file object
 * @returns {Object} File information
 */
const getFileInfo = (file) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path,
    url: `/uploads/${path.basename(file.path)}`,
    extension: path.extname(file.originalname),
    isImage: file.mimetype.startsWith('image/'),
    isVideo: file.mimetype.startsWith('video/'),
    isAudio: file.mimetype.startsWith('audio/'),
    isDocument: !file.mimetype.startsWith('image/') && 
                 !file.mimetype.startsWith('video/') && 
                 !file.mimetype.startsWith('audio/'),
  };
};

/**
 * Get multiple file info
 * @param {Array} files - Array of multer file objects
 * @returns {Array} File information array
 */
const getFilesInfo = (files) => {
  if (Array.isArray(files)) {
    return files.map(file => getFileInfo(file));
  }
  return [];
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate file type
 * @param {Object} file - Multer file object
 * @param {Array} allowedTypes - Array of UPLOAD_TYPES
 * @returns {boolean} Is valid
 */
const isValidFileType = (file, allowedTypes = [UPLOAD_TYPES.IMAGE]) => {
  let allowedMimeTypes = [];
  allowedTypes.forEach(type => {
    if (ALLOWED_MIME_TYPES[type]) {
      allowedMimeTypes = [...allowedMimeTypes, ...ALLOWED_MIME_TYPES[type]];
    }
  });

  return allowedMimeTypes.some(mimeType => {
    return file.mimetype === mimeType ||
           (file.mimetype.startsWith('image/') && allowedTypes.includes(UPLOAD_TYPES.IMAGE)) ||
           (file.mimetype.startsWith('video/') && allowedTypes.includes(UPLOAD_TYPES.VIDEO)) ||
           (file.mimetype.startsWith('audio/') && allowedTypes.includes(UPLOAD_TYPES.AUDIO));
  });
};

/**
 * Validate file size
 * @param {Object} file - Multer file object
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} Is valid
 */
const isValidFileSize = (file, maxSize = 5 * 1024 * 1024) => {
  return file.size <= maxSize;
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  // Main upload instances
  upload,
  uploadImage,
  uploadVideo,
  uploadAvatar,
  uploadCover,
  uploadStory,
  uploadDocument,
  uploadMessage,
  uploadMultiple,
  uploadMixed,

  // Utility functions
  deleteFile,
  deleteFiles,
  getFileInfo,
  getFilesInfo,
  isValidFileType,
  isValidFileSize,
  handleUploadError,

  // Configuration
  createUpload,
  createStorage,
  createFileFilter,

  // Constants
  UPLOAD_TYPES,
  FILE_SIZE_LIMITS,
  ALLOWED_MIME_TYPES,
};

// ============================================
// ROUTE USAGE EXAMPLES
// ============================================

/**
 * Example route usage:
 * 
 * // Single file upload
 * router.post('/posts', protect, upload.single('media'), createPost);
 * 
 * // Avatar upload
 * router.put('/users/avatar', protect, uploadAvatar.single('avatar'), updateAvatar);
 * 
 * // Cover photo upload
 * router.put('/users/cover', protect, uploadCover.single('cover'), updateCoverPhoto);
 * 
 * // Story upload
 * router.post('/stories', protect, uploadStory.single('story'), createStory);
 * 
 * // Multiple file upload
 * router.post('/posts/multiple', protect, uploadMultiple('images', 5), createMultiplePosts);
 * 
 * // Mixed file upload (different fields)
 * router.post('/posts/mixed', protect, uploadMixed([
 *   { name: 'image', maxCount: 5 },
 *   { name: 'video', maxCount: 2 },
 *   { name: 'document', maxCount: 3 }
 * ]), createMixedPost);
 * 
 * // Document upload
 * router.post('/documents', protect, uploadDocument.single('document'), uploadDocument);
 * 
 * // Message attachment
 * router.post('/messages/:userId', protect, uploadMessage.single('attachment'), sendMessageWithAttachment);
 * 
 * // Error handling
 * router.post('/upload', upload.single('file'), controllerFunction, handleUploadError);
 */