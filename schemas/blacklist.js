const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    reason: { type: String, required: true },
    proof: { type: String, required: true },
    staffId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
    removedAt: { type: Date },
    removalReason: { type: String },
    removalProof: { type: String }, 
    removalStaffId: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

blacklistSchema.statics.addToBlacklist = async function (userId, reason, proof, staffId) {
    const existingEntry = await this.findOne({ userId });
    if (existingEntry) return { success: false, message: 'El usuario ya está en la lista negra.' };

    const newEntry = new this({ userId, reason, proof, staffId });
    await newEntry.save();
    return { success: true, message: `Usuario ${userId} añadido a la lista negra.` };
};

blacklistSchema.statics.removeFromBlacklist = async function (userId, removalReason, removalProof, removalStaffId) {
    const entry = await this.findOne({ userId, isActive: true });
    if (!entry) return { success: false, message: 'El usuario no está en la lista negra.' };

    entry.removedAt = new Date();
    entry.removalReason = removalReason;
    entry.removalProof = removalProof;
    entry.removalStaffId = removalStaffId;
    entry.isActive = false;

    await entry.save();
    return { success: true, message: `Usuario ${userId} eliminado de la lista negra.` };
};

blacklistSchema.statics.getBlacklistInfo = async function (userId) {
    const entry = await this.findOne({ userId });
    return entry ? { success: true, data: entry } : { success: false, message: 'No hay información sobre este usuario en la lista negra.' };
};

blacklistSchema.statics.getActiveBlacklist = async function () {
    return await this.find({ isActive: true });
};

module.exports = mongoose.models.Blacklist || mongoose.model('Blacklist', blacklistSchema);
