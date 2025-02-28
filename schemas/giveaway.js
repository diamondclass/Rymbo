const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    messageId: { 
        type: String, 
        required: true, 
        unique: true,
        validate: {
            validator: v => /^\d+$/.test(v),
            message: "ID de mensaje inválido"
        }
    },
    channelId: { 
        type: String, 
        required: true,
        validate: {
            validator: v => /^\d+$/.test(v),
            message: "ID de canal inválido"
        }
    },
    guildId: { 
        type: String, 
        required: true,
        validate: {
            validator: v => /^\d+$/.test(v),
            message: "ID de servidor inválido"
        }
    },
    prize: { type: String, required: true },
    winners: { type: Number, required: true, min: 1 },
    endTime: { type: Date, required: true },
    hostedBy: { type: String, required: true },
    requirements: {
        role: { type: String, validate: v => v ? /^\d+$/.test(v) : true },
        invites: { type: Number, min: 1 }
    },
    participants: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Giveaway', giveawaySchema);