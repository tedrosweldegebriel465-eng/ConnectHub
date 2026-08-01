/**
 * ============================================
 * REPORT MODEL
 * Version: 2.0.0
 * Description: Report schema for content moderation
 *              with support for multiple target types, status, and admin actions
 * ============================================
 */

const mongoose = require('mongoose');

// ============================================
// CONSTANTS
// ============================================

const REPORT_TARGET_TYPES = {
  POST: 'post',
  USER: 'user',
  COMMENT: 'comment',
  MESSAGE: 'message',
  STORY: 'story',
};

const REPORT_CATEGORIES = {
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  HATE_SPEECH: 'hate_speech',
  NSFW: 'nsfw',
  MISINFORMATION: 'misinformation',
  IMPERSONATION: 'impersonation',
  COPYRIGHT: 'copyright',
  PRIVACY: 'privacy',
  SELF_HARM: 'self_harm',
  VIOLENCE: 'violence',
  OTHER: 'other',
};

const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  ESCALATED: 'escalated',
};

const REPORT_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// ============================================
// REPORT SCHEMA
// ============================================

const reportSchema = new mongoose.Schema(
  {
    // ===== Reporter =====
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true,
    },

    // ===== Target =====
    targetType: {
      type: String,
      enum: Object.values(REPORT_TARGET_TYPES),
      required: [true, 'Target type is required'],
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true,
      refPath: 'targetType',
    },

    // ===== Report Content =====
    category: {
      type: String,
      enum: Object.values(REPORT_CATEGORIES),
      required: [true, 'Report category is required'],
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    evidence: [{
      type: String,
      trim: true,
    }],

    // ===== Status =====
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(REPORT_PRIORITIES),
      default: REPORT_PRIORITIES.MEDIUM,
    },

    // ===== Admin Actions =====
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolution: {
      type: String,
      enum: ['warned', 'suspended', 'banned', 'deleted', 'dismissed', 'escalated'],
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Resolution note cannot exceed 500 characters'],
    },

    // ===== Metadata =====
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ===== Duplicate Tracking =====
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      default: null,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },

    // ===== Feedback =====
    reporterFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [200, 'Feedback cannot exceed 200 characters'],
      },
      createdAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

// Compound indexes for efficient queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ category: 1, status: 1 });
reportSchema.index({ priority: 1, status: 1 });
reportSchema.index({ assignedTo: 1, status: 1 });

// Unique index to prevent duplicate reports (same reporter, target, category)
reportSchema.index(
  { reporter: 1, targetId: 1, category: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'reviewing'] } } }
);

// ============================================
// VIRTUALS
// ============================================

// Virtual for formatted target reference
reportSchema.virtual('targetRef').get(function() {
  return `${this.targetType}:${this.targetId}`;
});

// Virtual for age of report
reportSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for is escalated
reportSchema.virtual('isEscalated').get(function() {
  return this.status === REPORT_STATUS.ESCALATED;
});

// Virtual for is resolved
reportSchema.virtual('isResolved').get(function() {
  return this.status === REPORT_STATUS.RESOLVED || 
         this.status === REPORT_STATUS.DISMISSED;
});

// ============================================
// MIDDLEWARE
// ============================================

// ===== Pre-save middleware =====
reportSchema.pre('save', function(next) {
  // Trim reason and description
  if (this.reason) {
    this.reason = this.reason.trim();
  }
  if (this.description) {
    this.description = this.description.trim();
  }

  // Set priority based on category
  if (!this.priority) {
    const priorityMap = {
      [REPORT_CATEGORIES.SELF_HARM]: REPORT_PRIORITIES.HIGH,
      [REPORT_CATEGORIES.VIOLENCE]: REPORT_PRIORITIES.HIGH,
      [REPORT_CATEGORIES.HARASSMENT]: REPORT_PRIORITIES.HIGH,
      [REPORT_CATEGORIES.HATE_SPEECH]: REPORT_PRIORITIES.MEDIUM,
      [REPORT_CATEGORIES.IMPERSONATION]: REPORT_PRIORITIES.MEDIUM,
      [REPORT_CATEGORIES.NSFW]: REPORT_PRIORITIES.MEDIUM,
      [REPORT_CATEGORIES.SPAM]: REPORT_PRIORITIES.LOW,
      [REPORT_CATEGORIES.MISINFORMATION]: REPORT_PRIORITIES.MEDIUM,
      [REPORT_CATEGORIES.COPYRIGHT]: REPORT_PRIORITIES.MEDIUM,
      [REPORT_CATEGORIES.PRIVACY]: REPORT_PRIORITIES.MEDIUM,
      [REPORT_CATEGORIES.OTHER]: REPORT_PRIORITIES.LOW,
    };
    this.priority = priorityMap[this.category] || REPORT_PRIORITIES.MEDIUM;
  }

  // Set resolvedAt when status changes to resolved
  if (this.isModified('status') && 
      (this.status === REPORT_STATUS.RESOLVED || this.status === REPORT_STATUS.DISMISSED)) {
    this.resolvedAt = new Date();
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get reports with filters
 * @param {Object} filters - Filter options
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Reports
 */
reportSchema.statics.getReports = async function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const query = { ...filters };

  // Filter by date range
  if (filters.fromDate) {
    query.createdAt = { ...query.createdAt, $gte: new Date(filters.fromDate) };
  }
  if (filters.toDate) {
    query.createdAt = { ...query.createdAt, $lte: new Date(filters.toDate) };
  }

  const reports = await this.find(query)
    .populate('reporter', 'name username avatar email')
    .populate('assignedTo', 'name username')
    .populate('resolvedBy', 'name username')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get report statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Statistics
 */
reportSchema.statics.getStats = async function(filters = {}) {
  const query = { ...filters };

  const [
    total,
    byStatus,
    byCategory,
    byPriority,
    pending,
    resolved,
    dismissed,
    escalated,
  ] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    this.countDocuments({ ...query, status: REPORT_STATUS.PENDING }),
    this.countDocuments({ ...query, status: REPORT_STATUS.RESOLVED }),
    this.countDocuments({ ...query, status: REPORT_STATUS.DISMISSED }),
    this.countDocuments({ ...query, status: REPORT_STATUS.ESCALATED }),
  ]);

  return {
    total,
    pending,
    resolved,
    dismissed,
    escalated,
    byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
  };
};

/**
 * Check if user has already reported a target
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} targetId - Target ID
 * @param {String} targetType - Target type
 * @returns {Promise<Boolean>} Has reported
 */
reportSchema.statics.hasReported = async function(userId, targetId, targetType) {
  const report = await this.findOne({
    reporter: userId,
    targetId,
    targetType,
    status: { $in: ['pending', 'reviewing'] },
  });
  return !!report;
};

/**
 * Get reports by target
 * @param {ObjectId} targetId - Target ID
 * @param {String} targetType - Target type
 * @returns {Promise<Array>} Reports
 */
reportSchema.statics.getByTarget = async function(targetId, targetType) {
  return this.find({
    targetId,
    targetType,
    status: { $ne: REPORT_STATUS.DISMISSED },
  })
    .populate('reporter', 'name username')
    .sort({ createdAt: -1 });
};

/**
 * Get reports by category
 * @param {String} category - Category
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Reports
 */
reportSchema.statics.getByCategory = async function(category, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const reports = await this.find({ category, status: REPORT_STATUS.PENDING })
    .populate('reporter', 'name username')
    .populate('assignedTo', 'name username')
    .sort({ priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({ category, status: REPORT_STATUS.PENDING });

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Assign report to admin
 * @param {ObjectId} adminId - Admin ID
 * @returns {Promise<Object>} Updated report
 */
reportSchema.methods.assignTo = async function(adminId) {
  this.assignedTo = adminId;
  this.status = REPORT_STATUS.REVIEWING;
  await this.save();
  return this;
};

/**
 * Resolve report
 * @param {ObjectId} adminId - Admin ID
 * @param {String} resolution - Resolution type
 * @param {String} note - Resolution note
 * @returns {Promise<Object>} Updated report
 */
reportSchema.methods.resolve = async function(adminId, resolution, note = '') {
  this.status = REPORT_STATUS.RESOLVED;
  this.resolvedBy = adminId;
  this.resolution = resolution;
  this.resolutionNote = note;
  this.resolvedAt = new Date();
  await this.save();
  return this;
};

/**
 * Dismiss report
 * @param {ObjectId} adminId - Admin ID
 * @param {String} note - Dismissal note
 * @returns {Promise<Object>} Updated report
 */
reportSchema.methods.dismiss = async function(adminId, note = '') {
  this.status = REPORT_STATUS.DISMISSED;
  this.resolvedBy = adminId;
  this.resolution = 'dismissed';
  this.resolutionNote = note;
  this.resolvedAt = new Date();
  await this.save();
  return this;
};

/**
 * Escalate report
 * @param {ObjectId} adminId - Admin ID
 * @param {String} note - Escalation note
 * @returns {Promise<Object>} Updated report
 */
reportSchema.methods.escalate = async function(adminId, note = '') {
  this.status = REPORT_STATUS.ESCALATED;
  this.assignedTo = adminId;
  this.resolutionNote = note;
  await this.save();
  return this;
};

/**
 * Add reporter feedback
 * @param {Number} rating - Rating (1-5)
 * @param {String} comment - Feedback comment
 * @returns {Promise<Object>} Updated report
 */
reportSchema.methods.addFeedback = async function(rating, comment = '') {
  this.reporterFeedback = {
    rating,
    comment,
    createdAt: new Date(),
  };
  await this.save();
  return this;
};

/**
 * Mark as duplicate
 * @param {ObjectId} originalReportId - Original report ID
 * @returns {Promise<Object>} Updated report
 */
reportSchema.methods.markAsDuplicate = async function(originalReportId) {
  this.isDuplicate = true;
  this.duplicateOf = originalReportId;
  this.status = REPORT_STATUS.DISMISSED;
  this.resolution = 'dismissed';
  this.resolutionNote = 'Duplicate report';
  this.resolvedAt = new Date();
  await this.save();
  return this;
};

// ============================================
// EXPORT
// ============================================

const Report = mongoose.model('Report', reportSchema);

// Export constants
Report.REPORT_TARGET_TYPES = REPORT_TARGET_TYPES;
Report.REPORT_CATEGORIES = REPORT_CATEGORIES;
Report.REPORT_STATUS = REPORT_STATUS;
Report.REPORT_PRIORITIES = REPORT_PRIORITIES;

module.exports = Report;